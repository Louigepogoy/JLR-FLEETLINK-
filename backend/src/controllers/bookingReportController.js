const { query } = require('../config/db');

// Bookings that actually went ahead (or are going ahead) count as rentals; pending, rejected and
// cancelled ones are reported separately.
const RENTED_STATUSES = `('approved', 'active', 'completed')`;

// Rental days are inclusive: a booking from the 1st to the 3rd is 3 days.
const DAYS_SQL = '(b.end_date - b.start_date + 1)';

const STATUS_COUNTS_SQL = `
  COUNT(*)::int AS total_bookings,
  COUNT(*) FILTER (WHERE b.status IN ${RENTED_STATUSES})::int AS rented,
  COUNT(*) FILTER (WHERE b.status = 'completed')::int AS completed,
  COUNT(*) FILTER (WHERE b.status = 'active')::int AS active,
  COUNT(*) FILTER (WHERE b.status IN ('pending', 'approved'))::int AS upcoming,
  COUNT(*) FILTER (WHERE b.status IN ('cancelled', 'rejected'))::int AS cancelled,
  COUNT(DISTINCT b.vehicle_id) FILTER (WHERE b.status IN ${RENTED_STATUSES})::int AS vehicles_rented,
  COALESCE(SUM(b.total_amount) FILTER (WHERE b.status IN ${RENTED_STATUSES}), 0)::float AS total_amount,
  COALESCE(SUM(${DAYS_SQL}) FILTER (WHERE b.status IN ${RENTED_STATUSES}), 0)::int AS rental_days`;

/**
 * Booking report for the signed-in user, from both sides:
 * - owner: bookings on the vehicles they list, their best-selling vehicle, and a per-vehicle breakdown
 * - renter: how many bookings they've made and which vehicles they've rented
 */
const getBookingReport = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [ownerSummary, ownerVehicles, ownerMonthly, renterSummary, renterVehicles] = await Promise.all([
      query(
        `SELECT ${STATUS_COUNTS_SQL},
                (SELECT COUNT(*)::int FROM vehicles WHERE owner_id = $1) AS vehicles_listed
         FROM bookings b JOIN vehicles v ON v.id = b.vehicle_id
         WHERE v.owner_id = $1`,
        [userId]
      ),
      // Every listed vehicle, best seller first: most rentals, then highest booking value.
      query(
        `SELECT v.id, v.title, v.brand, v.model, v.plate_number, v.images[1] AS image,
                COUNT(b.id)::int AS total_bookings,
                COUNT(b.id) FILTER (WHERE b.status IN ${RENTED_STATUSES})::int AS rented,
                COUNT(b.id) FILTER (WHERE b.status = 'completed')::int AS completed,
                COALESCE(SUM(b.total_amount) FILTER (WHERE b.status IN ${RENTED_STATUSES}), 0)::float AS total_amount,
                COALESCE(SUM(${DAYS_SQL}) FILTER (WHERE b.status IN ${RENTED_STATUSES}), 0)::int AS rental_days,
                MAX(b.start_date) FILTER (WHERE b.status IN ${RENTED_STATUSES}) AS last_rented
         FROM vehicles v
         LEFT JOIN bookings b ON b.vehicle_id = v.id
         WHERE v.owner_id = $1
         GROUP BY v.id
         ORDER BY rented DESC, total_amount DESC, v.title ASC`,
        [userId]
      ),
      // Rentals per month on the owner's vehicles, last 6 months (months with none included as 0).
      query(
        `SELECT TO_CHAR(m.month, 'YYYY-MM') AS month,
                COUNT(b.id)::int AS rentals,
                COALESCE(SUM(b.total_amount), 0)::float AS total_amount
         FROM generate_series(date_trunc('month', NOW()) - INTERVAL '5 months', date_trunc('month', NOW()), INTERVAL '1 month') AS m(month)
         LEFT JOIN bookings b ON date_trunc('month', b.start_date) = m.month
           AND b.status IN ${RENTED_STATUSES}
           AND b.vehicle_id IN (SELECT id FROM vehicles WHERE owner_id = $1)
         GROUP BY m.month
         ORDER BY m.month`,
        [userId]
      ),
      query(
        `SELECT ${STATUS_COUNTS_SQL}
         FROM bookings b
         WHERE b.customer_id = $1`,
        [userId]
      ),
      // Vehicles this user has rented, most often first.
      query(
        `SELECT v.id, v.title, v.brand, v.model, v.images[1] AS image,
                COUNT(b.id)::int AS times_rented,
                COALESCE(SUM(b.total_amount), 0)::float AS total_amount,
                COALESCE(SUM(${DAYS_SQL}), 0)::int AS rental_days,
                MAX(b.start_date) AS last_rented
         FROM bookings b JOIN vehicles v ON v.id = b.vehicle_id
         WHERE b.customer_id = $1 AND b.status IN ${RENTED_STATUSES}
         GROUP BY v.id
         ORDER BY times_rented DESC, last_rented DESC
         LIMIT 20`,
        [userId]
      ),
    ]);

    const vehicles = ownerVehicles.rows;
    const bestSeller = vehicles[0] && vehicles[0].rented > 0 ? vehicles[0] : null;

    res.json({
      success: true,
      data: {
        owner: {
          summary: ownerSummary.rows[0],
          bestSeller,
          vehicles,
          monthly: ownerMonthly.rows,
        },
        renter: {
          summary: renterSummary.rows[0],
          vehicles: renterVehicles.rows,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getBookingReport };
