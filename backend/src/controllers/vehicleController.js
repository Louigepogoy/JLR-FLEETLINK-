const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');
const { createNotification } = require('../utils/notifications');
const { ACTIVE_SUBSCRIPTION_SQL } = require('./subscriptionController');

const VEHICLE_TYPES = [
  'Sedan', 'SUV', 'Hatchback', 'Pickup', 'Van', 'Truck',
  'Motorcycle', 'Coupe', 'Convertible', 'MPV', 'Electric', 'Other',
];

const PROOF_FIELD_MAP = {
  proofFront: 'front',
  proofBack: 'back',
  proofSide: 'side',
  proofInterior: 'interior',
  proofOwner: 'ownerWithVehicle',
  proofExtra: 'additionalProof',
};

const PUBLIC_GALLERY_KEYS = ['front', 'back', 'side', 'interior'];

// All 82 provinces + Metro Manila with their capital's coordinates (default map pin).
// Mirrors frontend/src/lib/philippines.ts.
const PH_PROVINCES = require('../data/ph-provinces.json');
const PROVINCE_BY_NAME = new Map(PH_PROVINCES.map((p) => [p.name, p]));

// Rough bounding box of the Philippines, to reject pins dropped in the wrong country.
const PH_BOUNDS = { minLat: 4.2, maxLat: 21.3, minLng: 116.5, maxLng: 127 };

const VEHICLE_LIMIT_BY_PLAN = {
  basic: 5,
  pro: 10,
  premium: 20,
  enterprise: 50,
};

const locationError = (message) => {
  const error = new Error(message);
  error.status = 400;
  error.statusCode = 400;
  return error;
};

const normalizeVehicleLocation = (bodyData) => {
  const provinceName = String(bodyData.province || '').trim();
  const province = PROVINCE_BY_NAME.get(provinceName);
  if (!province) throw locationError('Please choose a valid Philippine province for the vehicle.');

  const city = String(bodyData.city || '').trim();
  if (!city || city.length > 100) throw locationError('Please enter the city or municipality (up to 100 characters).');

  const latitude = bodyData.latitude === undefined || bodyData.latitude === ''
    ? province.lat
    : Number(bodyData.latitude);
  const longitude = bodyData.longitude === undefined || bodyData.longitude === ''
    ? province.lng
    : Number(bodyData.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw locationError('Pickup latitude and longitude must be valid numbers.');
  }
  if (latitude < PH_BOUNDS.minLat || latitude > PH_BOUNDS.maxLat || longitude < PH_BOUNDS.minLng || longitude > PH_BOUNDS.maxLng) {
    throw locationError('The pickup pin must be inside the Philippines.');
  }

  return {
    province: province.name,
    city,
    location: `${city}, ${province.name}`,
    barangay: bodyData.barangay || null,
    pickupAddress: bodyData.pickupAddress || bodyData.pickup_address || null,
    latitude,
    longitude,
  };
};

const getOwnerVehicleLimit = async (ownerId) => {
  const subscription = await query(
    `SELECT plan_id, vehicle_limit
     FROM owner_subscriptions
     WHERE owner_id = $1 AND ${ACTIVE_SUBSCRIPTION_SQL}
     ORDER BY created_at DESC LIMIT 1`,
    [ownerId]
  );

  const planId = subscription.rows[0]?.plan_id || 'basic';
  const limit = Number(subscription.rows[0]?.vehicle_limit || VEHICLE_LIMIT_BY_PLAN[planId] || 5);

  return { planId, limit };
};

const enforceOwnerVehicleLimit = async (ownerId) => {
  const [{ rows: countRows }, plan] = await Promise.all([
    query('SELECT COUNT(*)::int AS count FROM vehicles WHERE owner_id = $1', [ownerId]),
    getOwnerVehicleLimit(ownerId),
  ]);

  const currentCount = Number(countRows[0]?.count || 0);
  if (currentCount >= plan.limit) {
    const error = new Error(
      plan.planId !== 'basic'
        ? `Your ${plan.planId} plan allows up to ${plan.limit} vehicles. Buy extra vehicle slots (₱500 each) on the Subscription page to add more.`
        : `Your ${plan.planId} plan allows up to ${plan.limit} vehicles. Please select a higher subscription plan to add more vehicles.`
    );
    error.status = 403;
    error.upgradeRequired = true;
    error.currentCount = currentCount;
    error.vehicleLimit = plan.limit;
    error.planId = plan.planId;
    throw error;
  }
};

const getFileUrl = (req, file) => `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;

const getProofPhotosFromRequest = (req, existingProof = {}) => {
  const proof = { ...(existingProof || {}) };

  Object.entries(PROOF_FIELD_MAP).forEach(([fieldName, proofKey]) => {
    const uploaded = req.files?.[fieldName]?.[0];
    if (uploaded) {
      proof[proofKey] = getFileUrl(req, uploaded);
    }
  });

  return proof;
};

const buildGalleryImages = (proofPhotos = {}) =>
  PUBLIC_GALLERY_KEYS.map((key) => proofPhotos[key]).filter(Boolean);

const validateProofPhotos = (proofPhotos = {}, isCreate = true) => {
  const missing = Object.values(PROOF_FIELD_MAP).filter((key) => !proofPhotos[key]);
  if (isCreate && missing.length) {
    const labels = {
      front: 'Front view',
      back: 'Rear view',
      side: 'Side view',
      interior: 'Interior',
      ownerWithVehicle: 'You with vehicle',
      additionalProof: 'Extra proof',
    };
    const error = new Error(
      `All 6 vehicle proof photos are required. Missing: ${missing.map((k) => labels[k]).join(', ')}`
    );
    error.status = 400;
    error.statusCode = 400;
    throw error;
  }
};

const getPublicStats = async (req, res, next) => {
  try {
    const [vehicles, users, provinces] = await Promise.all([
      query("SELECT COUNT(*)::int AS count FROM vehicles WHERE status = 'available' AND verification_status <> 'rejected'"),
      query("SELECT COUNT(*)::int AS count FROM users WHERE approval_status = 'approved' AND is_active = true"),
      query("SELECT COUNT(DISTINCT province)::int AS count FROM vehicles WHERE status <> 'inactive'"),
    ]);

    res.json({
      success: true,
      data: {
        availableVehicles: vehicles.rows[0].count,
        activeUsers: users.rows[0].count,
        // Where the platform operates (every province) vs. where listings exist today.
        provincesCovered: PH_PROVINCES.length,
        provincesWithListings: provinces.rows[0].count,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getVehicles = async (req, res, next) => {
  try {
    const { search, type, minPrice, maxPrice, location, province, status = 'available' } = req.query;
    const params = [];
    let idx = 1;

    // Optional "near me": the renter's location (nearLat/nearLng). When given, each vehicle gets a
    // straight-line distance_km to its pickup pin and the list is sorted nearest first. Not stored.
    const nearLat = Number(req.query.nearLat);
    const nearLng = Number(req.query.nearLng);
    const useDistance = req.query.nearLat !== undefined && req.query.nearLng !== undefined
      && Number.isFinite(nearLat) && Number.isFinite(nearLng)
      && Math.abs(nearLat) <= 90 && Math.abs(nearLng) <= 180;
    let distanceSelect = 'NULL::float AS distance_km';
    if (useDistance) {
      // Haversine formula, Earth radius 6371 km. NULL when the vehicle has no pickup pin.
      distanceSelect = `ROUND((6371 * 2 * ASIN(SQRT(
          POWER(SIN(RADIANS(v.latitude::float - $1) / 2), 2)
          + COS(RADIANS($1)) * COS(RADIANS(v.latitude::float)) * POWER(SIN(RADIANS(v.longitude::float - $2) / 2), 2)
        )))::numeric, 1)::float AS distance_km`;
      params.push(nearLat, nearLng);
      idx = 3;
    }

    let sql = `
      SELECT v.*, u.full_name as owner_name, ${distanceSelect},
        EXISTS (
          SELECT 1 FROM vehicle_maintenance_dates vmd
          WHERE vmd.vehicle_id = v.id AND CURRENT_DATE BETWEEN vmd.start_date AND vmd.end_date
        ) AS on_maintenance,
        (SELECT ROUND(AVG(r.vehicle_rating)::numeric, 1) FROM booking_reviews r WHERE r.vehicle_id = v.id) AS avg_rating,
        (SELECT COUNT(*)::int FROM booking_reviews r WHERE r.vehicle_id = v.id) AS rating_count
      FROM vehicles v
      JOIN users u ON v.owner_id = u.id
      WHERE v.verification_status <> 'rejected'
    `;

    if (status) {
      sql += ` AND v.status = $${idx++}`;
      params.push(status);
    }
    if (search) {
      sql += ` AND (v.title ILIKE $${idx} OR v.brand ILIKE $${idx} OR v.model ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    if (type) {
      sql += ` AND v.vehicle_type = $${idx++}`;
      params.push(type);
    }
    if (province) {
      sql += ` AND v.province = $${idx++}`;
      params.push(province);
    }
    if (location) {
      sql += ` AND (v.city ILIKE $${idx} OR v.province ILIKE $${idx} OR v.barangay ILIKE $${idx} OR v.pickup_address ILIKE $${idx})`;
      params.push(`%${location}%`);
      idx++;
    }
    if (minPrice) {
      sql += ` AND v.price_per_day >= $${idx++}`;
      params.push(minPrice);
    }
    if (maxPrice) {
      sql += ` AND v.price_per_day <= $${idx++}`;
      params.push(maxPrice);
    }

    sql += useDistance ? ' ORDER BY distance_km ASC NULLS LAST, v.created_at DESC' : ' ORDER BY v.created_at DESC';
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

const getVehicleById = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT v.*, u.full_name as owner_name, u.phone as owner_phone, u.avatar_url as owner_avatar_url,
        EXISTS (
          SELECT 1 FROM vehicle_maintenance_dates vmd
          WHERE vmd.vehicle_id = v.id AND CURRENT_DATE BETWEEN vmd.start_date AND vmd.end_date
        ) AS on_maintenance,
        (SELECT ROUND(AVG(r.vehicle_rating)::numeric, 1) FROM booking_reviews r WHERE r.vehicle_id = v.id) AS avg_rating,
        (SELECT COUNT(*)::int FROM booking_reviews r WHERE r.vehicle_id = v.id) AS rating_count,
        (SELECT ROUND(AVG(r.user_rating)::numeric, 1) FROM booking_reviews r WHERE r.reviewee_id = v.owner_id) AS owner_avg_rating,
        (SELECT COUNT(*)::int FROM booking_reviews r WHERE r.reviewee_id = v.owner_id) AS owner_rating_count
       FROM vehicles v JOIN users u ON v.owner_id = u.id
       WHERE v.id = $1`,
      [req.params.id]
    );
    const vehicle = result.rows[0];
    const canSeeRejected = req.user && (req.user.role === 'admin' || req.user.id === vehicle?.owner_id);
    if (!vehicle || (vehicle.verification_status === 'rejected' && !canSeeRejected)) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    res.json({ success: true, data: vehicle });
  } catch (error) {
    next(error);
  }
};

const createVehicle = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    if (req.user.approval_status !== 'approved') {
      return res.status(403).json({
        success: false,
        code: 'VERIFICATION_REQUIRED',
        message: 'Please verify your driver\'s license before listing a vehicle.',
      });
    }

    const {
      title, brand, model, year, vehicleType, transmission, fuelType,
      seats, pricePerDay, plateNumber, description, images, features,
      driverAvailable, driverFeePerDay,
    } = req.body;
    const vehicleLocation = normalizeVehicleLocation(req.body);
    await enforceOwnerVehicleLimit(req.user.id);

    const proofPhotos = getProofPhotosFromRequest(req);
    validateProofPhotos(proofPhotos, true);
    const vehicleImages = buildGalleryImages(proofPhotos);
    const isDriverAvailable = driverAvailable === true || driverAvailable === 'true';

    const result = await query(
      `INSERT INTO vehicles (owner_id, title, brand, model, plate_number, year, vehicle_type, transmission,
        fuel_type, seats, price_per_day, location, city, barangay, pickup_address,
        latitude, longitude, description, images, proof_photos, features,
        driver_available, driver_fee_per_day, province)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
       RETURNING *`,
      [
        req.user.id, title, brand, model, plateNumber || null, year, vehicleType, transmission,
        fuelType, seats || 4, pricePerDay, vehicleLocation.location, vehicleLocation.city,
        vehicleLocation.barangay, vehicleLocation.pickupAddress, vehicleLocation.latitude,
        vehicleLocation.longitude, description || null,
        vehicleImages, JSON.stringify(proofPhotos), features || [],
        isDriverAvailable, isDriverAvailable ? (driverFeePerDay || 0) : 0, vehicleLocation.province,
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const updateVehicle = async (req, res, next) => {
  try {
    const vehicle = await query('SELECT * FROM vehicles WHERE id = $1', [req.params.id]);
    if (!vehicle.rows[0]) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    if (vehicle.rows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const fields = ['title', 'brand', 'model', 'plate_number', 'year', 'vehicle_type', 'transmission',
      'fuel_type', 'seats', 'price_per_day', 'location', 'province', 'city', 'barangay',
      'pickup_address', 'latitude', 'longitude', 'description', 'images', 'proof_photos', 'features', 'status',
      'driver_available', 'driver_fee_per_day'];
    const mapping = {
      vehicleType: 'vehicle_type', pricePerDay: 'price_per_day', fuelType: 'fuel_type',
      pickupAddress: 'pickup_address', plateNumber: 'plate_number', proofPhotos: 'proof_photos',
      driverAvailable: 'driver_available', driverFeePerDay: 'driver_fee_per_day',
    };
    const bodyData = { ...req.body };
    if (bodyData.driverAvailable !== undefined) {
      bodyData.driverAvailable = bodyData.driverAvailable === true || bodyData.driverAvailable === 'true';
    }
    const existingProof = typeof vehicle.rows[0].proof_photos === 'object'
      ? vehicle.rows[0].proof_photos
      : (vehicle.rows[0].proof_photos ? JSON.parse(vehicle.rows[0].proof_photos) : {});

    const mergedProof = getProofPhotosFromRequest(req, existingProof);
    const hasNewProofUploads = Object.keys(PROOF_FIELD_MAP).some((field) => req.files?.[field]?.[0]);

    if (hasNewProofUploads) {
      bodyData.proof_photos = mergedProof;
      bodyData.images = buildGalleryImages(mergedProof);
    }

    if (bodyData.location !== undefined || bodyData.city !== undefined || bodyData.province !== undefined) {
      const vehicleLocation = normalizeVehicleLocation(bodyData);
      bodyData.province = vehicleLocation.province;
      bodyData.location = vehicleLocation.location;
      bodyData.city = vehicleLocation.city;
      bodyData.barangay = vehicleLocation.barangay;
      bodyData.pickup_address = vehicleLocation.pickupAddress;
      bodyData.latitude = vehicleLocation.latitude;
      bodyData.longitude = vehicleLocation.longitude;
      delete bodyData.pickupAddress;
    }

    const updates = [];
    const values = [];
    let i = 1;

    Object.entries(bodyData).forEach(([key, val]) => {
      const col = mapping[key] || key;
      if (fields.includes(col) && val !== undefined) {
        updates.push(`${col} = $${i++}`);
        values.push(col === 'proof_photos' ? JSON.stringify(val) : val);
      }
    });

    if (!updates.length) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    updates.push('updated_at = NOW()');
    // An owner fixing a rejected (or needs-more-info) listing sends it back to the admin for review;
    // until it is approved again it stays hidden from Browse Vehicles if it was rejected.
    if (req.user.role !== 'admin') {
      updates.push(`verification_status = CASE WHEN verification_status IN ('rejected', 'needs_more_info')
        THEN 'unreviewed' ELSE verification_status END`);
    }
    values.push(req.params.id);

    const result = await query(
      `UPDATE vehicles SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const deleteVehicle = async (req, res, next) => {
  try {
    const vehicle = await query('SELECT owner_id FROM vehicles WHERE id = $1', [req.params.id]);
    if (!vehicle.rows[0]) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    if (vehicle.rows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    // Deleting a vehicle cascades to its bookings and their payment records. Keep the money trail:
    // a vehicle that was ever booked with a payment can only be set to inactive, not deleted.
    const paid = await query(
      `SELECT 1 FROM bookings b
       WHERE b.vehicle_id = $1
         AND (b.paid_amount > 0 OR EXISTS (SELECT 1 FROM payments p WHERE p.booking_id = b.id))
       LIMIT 1`,
      [req.params.id]
    );
    if (paid.rows[0]) {
      return res.status(409).json({
        success: false,
        message: 'This vehicle has bookings with payment records, so it can\'t be deleted. Set its status to Inactive to hide it instead.',
      });
    }
    await query('DELETE FROM vehicles WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Vehicle deleted' });
  } catch (error) {
    next(error);
  }
};

const getOwnerVehicles = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM vehicles WHERE owner_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

const getPendingVehicleVerifications = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT v.*, u.full_name as owner_name,
        (SELECT row_to_json(r) FROM (
           SELECT risk_score, verdict, reasons, summary, model, created_at
           FROM ai_verification_results
           WHERE subject_type = 'vehicle' AND subject_id = v.id
           ORDER BY created_at DESC LIMIT 1
         ) r) AS ai_result
       FROM vehicles v
       JOIN users u ON v.owner_id = u.id
       WHERE v.verification_status IN ('unreviewed', 'needs_more_info')
       ORDER BY v.created_at ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

const recordVehicleVerification = async (req, res, next) => {
  try {
    const { action, notes } = req.body;
    if (!['approved', 'rejected', 'needs_more_info'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }
    if (action !== 'approved' && !notes?.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide notes explaining this decision' });
    }

    const vehicle = await query('SELECT id, owner_id, title FROM vehicles WHERE id = $1', [req.params.id]);
    if (!vehicle.rows[0]) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    await query(
      'UPDATE vehicles SET verification_status = $1, verification_notes = $2, updated_at = NOW() WHERE id = $3',
      [action, notes?.trim() || null, req.params.id]
    );

    await query(
      `INSERT INTO verification_actions (subject_type, subject_id, admin_id, action, notes)
       VALUES ('vehicle', $1, $2, $3, $4)`,
      [req.params.id, req.user.id, action, notes?.trim() || null]
    );

    const titles = {
      approved: 'Vehicle Verified',
      rejected: 'Vehicle Verification Rejected',
      needs_more_info: 'Additional Info Needed for Your Vehicle',
    };
    await createNotification(
      vehicle.rows[0].owner_id,
      titles[action],
      (notes?.trim() || `Your listing "${vehicle.rows[0].title}" verification status is now: ${action.replace(/_/g, ' ')}.`)
        + (action === 'rejected'
          ? ' It is hidden from Browse Vehicles. Update the listing to send it back for review.'
          : action === 'approved' ? ' It now shows an "Approved by Admin" badge.' : ''),
      'system',
      '/dashboard/vehicles'
    );

    res.json({ success: true, message: 'Verification action recorded' });
  } catch (error) {
    next(error);
  }
};

const getMaintenanceDates = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM vehicle_maintenance_dates WHERE vehicle_id = $1 ORDER BY start_date ASC`,
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * Public date ranges already claimed by another customer's booking, so the booking UI can block
 * them the same way it blocks owner maintenance dates. Excludes cancelled/rejected bookings.
 */
const getBookedDates = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, start_date, end_date FROM bookings
       WHERE vehicle_id = $1 AND status IN ('pending', 'approved', 'active')
       ORDER BY start_date ASC`,
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

const addMaintenanceDate = async (req, res, next) => {
  try {
    const vehicle = await query('SELECT owner_id FROM vehicles WHERE id = $1', [req.params.id]);
    if (!vehicle.rows[0]) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    if (vehicle.rows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { startDate, endDate, reason } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Start and end date are required' });
    }
    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ success: false, message: 'End date must be on or after start date' });
    }

    const conflictingBooking = await query(
      `SELECT id FROM bookings
       WHERE vehicle_id = $1 AND status IN ('pending', 'approved', 'active')
         AND start_date <= $3 AND end_date >= $2`,
      [req.params.id, startDate, endDate]
    );
    if (conflictingBooking.rows.length) {
      return res.status(409).json({
        success: false,
        message: 'This vehicle already has a booking during part of that date range',
      });
    }

    const result = await query(
      `INSERT INTO vehicle_maintenance_dates (vehicle_id, start_date, end_date, reason)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, startDate, endDate, reason?.trim() || 'Maintenance']
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const deleteMaintenanceDate = async (req, res, next) => {
  try {
    const block = await query(
      `SELECT vmd.id, v.owner_id FROM vehicle_maintenance_dates vmd
       JOIN vehicles v ON vmd.vehicle_id = v.id
       WHERE vmd.id = $1 AND vmd.vehicle_id = $2`,
      [req.params.blockId, req.params.id]
    );
    if (!block.rows[0]) {
      return res.status(404).json({ success: false, message: 'Maintenance date not found' });
    }
    if (block.rows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    await query('DELETE FROM vehicle_maintenance_dates WHERE id = $1', [req.params.blockId]);
    res.json({ success: true, message: 'Maintenance date removed' });
  } catch (error) {
    next(error);
  }
};

const vehicleValidation = [
  body('title').trim().notEmpty(),
  body('brand').trim().notEmpty(),
  body('model').trim().notEmpty(),
  body('plateNumber').optional().trim(),
  body('year').isInt({ min: 1990, max: new Date().getFullYear() + 1 }),
  body('vehicleType').trim().notEmpty().isIn(VEHICLE_TYPES).withMessage('Invalid vehicle type'),
  body('transmission').trim().notEmpty(),
  body('fuelType').trim().notEmpty(),
  // A ₱0 listing could never be paid for (checkout needs a positive amount), so bookings would be stuck.
  body('pricePerDay').isFloat({ gt: 0 }).withMessage('Price per day must be more than ₱0'),
  body('province').trim().custom((value) => PROVINCE_BY_NAME.has(value))
    .withMessage('Please choose a valid Philippine province'),
  body('city').trim().isLength({ min: 1, max: 100 }).withMessage('Please enter the city or municipality'),
];

module.exports = {
  getVehicles, getVehicleById, createVehicle, updateVehicle,
  deleteVehicle, getOwnerVehicles, getPublicStats, vehicleValidation,
  getMaintenanceDates, addMaintenanceDate, deleteMaintenanceDate, getBookedDates,
  getPendingVehicleVerifications, recordVehicleVerification,
};
