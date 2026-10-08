const { query } = require('../config/db');

/**
 * Everything the booking's documents need: the rental agreement (who signed and when), the billing
 * statement (charges, online and cash payments, balance; the owner and admins also see the commission),
 * and the trip documents (the vehicle's OR/CR, for the authorization letter the renter shows at
 * checkpoints). The renter only gets the OR/CR while the vehicle is with them.
 */
const getBookingDocuments = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT b.*, v.title, v.brand, v.model, v.year, v.plate_number, v.vehicle_type, v.price_per_day,
              v.proof_photos, v.owner_id,
              o.full_name AS owner_name, o.phone AS owner_phone, o.email AS owner_email, o.business_name AS owner_business_name,
              o.owner_or_url, o.owner_cr_url,
              c.full_name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
              c.license_number AS customer_license_number
       FROM bookings b
       JOIN vehicles v ON v.id = b.vehicle_id
       JOIN users o ON o.id = v.owner_id
       JOIN users c ON c.id = b.customer_id
       WHERE b.id = $1`,
      [req.params.id]
    );
    const b = result.rows[0];
    if (!b) return res.status(404).json({ success: false, message: 'Booking not found' });

    const isAdmin = req.user.role === 'admin';
    const isOwner = b.owner_id === req.user.id;
    const isCustomer = b.customer_id === req.user.id;
    if (!isAdmin && !isOwner && !isCustomer) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const [payments, commission] = await Promise.all([
      query(
        `SELECT p.amount, p.payment_method, p.reference_number, p.created_at, t.invoice_number
         FROM payments p LEFT JOIN transactions t ON t.payment_id = p.id
         WHERE p.booking_id = $1 ORDER BY p.created_at ASC`,
        [b.id]
      ),
      query(
        `SELECT COALESCE(SUM(commission_amount), 0)::float AS commission, COALESCE(SUM(owner_amount), 0)::float AS owner_online,
                MAX(commission_percentage)::float AS commission_percentage
         FROM transactions WHERE booking_id = $1 AND type = 'payment'`,
        [b.id]
      ),
    ]);

    // OR/CR: the vehicle's own registration documents, else the ones from the owner's verification.
    const proof = b.proof_photos || {};
    const orUrl = proof.officialReceipt || b.owner_or_url || null;
    const crUrl = proof.certificateOfRegistration || b.owner_cr_url || null;
    const vehicleWithRenter = Boolean(b.handed_over_at) && ['approved', 'active'].includes(b.status);
    const tripDocsAvailable = isAdmin || isOwner || (isCustomer && vehicleWithRenter);

    const total = parseFloat(b.total_amount);
    const paid = parseFloat(b.paid_amount);
    const cashCollected = parseFloat(b.cash_collected);
    const lateFee = parseFloat(b.late_fee);
    const driverFee = parseFloat(b.driver_fee);

    res.json({
      success: true,
      data: {
        viewer: isAdmin ? 'admin' : isOwner ? 'owner' : 'customer',
        booking: {
          id: b.id, status: b.status, payment_status: b.payment_status, payment_option: b.payment_option,
          start_date: b.start_date, end_date: b.end_date, pickup_time: b.pickup_time, dropoff_time: b.dropoff_time,
          with_driver: b.with_driver, created_at: b.created_at, completed_at: b.completed_at, handed_over_at: b.handed_over_at,
        },
        vehicle: {
          title: b.title, brand: b.brand, model: b.model, year: b.year, plate_number: b.plate_number,
          vehicle_type: b.vehicle_type, price_per_day: parseFloat(b.price_per_day),
        },
        owner: { name: b.owner_name, phone: b.owner_phone, email: b.owner_email, business_name: b.owner_business_name },
        customer: {
          name: b.customer_name, phone: b.customer_phone, email: b.customer_email,
          license_number: b.customer_license_number,
        },
        agreement: {
          signed_name: b.agreement_signed_name, signed_at: b.agreement_signed_at, version: b.agreement_version,
        },
        billing: {
          rental: Math.round((total - driverFee - lateFee) * 100) / 100,
          driver_fee: driverFee,
          late_fee: lateFee,
          late_hours: b.late_hours,
          total,
          paid_online: Math.round((paid - cashCollected) * 100) / 100,
          paid_cash: cashCollected,
          cash_due: parseFloat(b.cash_due),
          balance: Math.round((total - paid) * 100) / 100,
          payments: payments.rows,
          // Commission and the owner's net only for the owner and admins.
          ...(isOwner || isAdmin ? {
            commission: commission.rows[0].commission,
            commission_percentage: commission.rows[0].commission_percentage,
            owner_net: Math.round((commission.rows[0].owner_online + cashCollected) * 100) / 100,
          } : {}),
        },
        trip_documents: {
          available: tripDocsAvailable,
          or_url: tripDocsAvailable ? orUrl : null,
          cr_url: tripDocsAvailable ? crUrl : null,
          has_documents: Boolean(orUrl && crUrl),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getBookingDocuments };
