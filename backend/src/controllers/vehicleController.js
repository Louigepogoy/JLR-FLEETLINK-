const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');

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

const CEBU_LOCATIONS = [
  'Cebu City',
  'Mandaue City',
  'Lapu-Lapu City',
  'Talisay City',
  'Toledo City',
  'Minglanilla',
  'Consolacion',
  'Cordova',
  'Carcar',
  'Naga Cebu',
  'Other Cebu municipalities',
];

const CEBU_LOCATION_COORDS = {
  'Cebu City': { latitude: 10.3157, longitude: 123.8854 },
  'Mandaue City': { latitude: 10.3403, longitude: 123.9416 },
  'Lapu-Lapu City': { latitude: 10.3103, longitude: 123.9494 },
  'Talisay City': { latitude: 10.2447, longitude: 123.8494 },
  'Toledo City': { latitude: 10.3773, longitude: 123.6386 },
  Minglanilla: { latitude: 10.2447, longitude: 123.7964 },
  Consolacion: { latitude: 10.3776, longitude: 123.9570 },
  Cordova: { latitude: 10.2538, longitude: 123.9494 },
  Carcar: { latitude: 10.1061, longitude: 123.6402 },
  'Naga Cebu': { latitude: 10.2088, longitude: 123.7580 },
  'Other Cebu municipalities': { latitude: 10.3157, longitude: 123.8854 },
};

const NEARBY_CEBU_AREAS = [
  'Mandaue City',
  'Lapu-Lapu City',
  'Talisay City',
  'Minglanilla',
  'Consolacion',
  'Cordova',
  'Naga Cebu',
];

const VEHICLE_LIMIT_BY_PLAN = {
  basic: 5,
  pro: 10,
  premium: 20,
};

const normalizeVehicleLocation = (bodyData) => {
  const city = bodyData.city || bodyData.location;

  if (!CEBU_LOCATIONS.includes(city)) {
    const error = new Error('Vehicle location must be within Cebu City or Cebu Province.');
    error.status = 400;
    error.statusCode = 400;
    throw error;
  }

  const fallbackCoords = CEBU_LOCATION_COORDS[city];
  const latitude = bodyData.latitude === undefined || bodyData.latitude === ''
    ? fallbackCoords.latitude
    : Number(bodyData.latitude);
  const longitude = bodyData.longitude === undefined || bodyData.longitude === ''
    ? fallbackCoords.longitude
    : Number(bodyData.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    const error = new Error('Pickup latitude and longitude must be valid numbers.');
    error.status = 400;
    error.statusCode = 400;
    throw error;
  }

  return {
    city,
    location: city,
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
     WHERE owner_id = $1 AND status = 'active'
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
      `Your ${plan.planId} plan allows up to ${plan.limit} vehicles. Please select a higher subscription plan to add more vehicles.`
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

const getVehicles = async (req, res, next) => {
  try {
    const { search, type, minPrice, maxPrice, location, area, status = 'available' } = req.query;
    let sql = `
      SELECT v.*, u.full_name as owner_name
      FROM vehicles v
      JOIN users u ON v.owner_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

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
    if (location) {
      sql += ` AND (v.city ILIKE $${idx} OR v.location ILIKE $${idx})`;
      params.push(`%${location}%`);
      idx++;
    }
    if (area === 'nearby') {
      sql += ` AND v.city = ANY($${idx++}::text[])`;
      params.push(NEARBY_CEBU_AREAS);
    }
    if (minPrice) {
      sql += ` AND v.price_per_day >= $${idx++}`;
      params.push(minPrice);
    }
    if (maxPrice) {
      sql += ` AND v.price_per_day <= $${idx++}`;
      params.push(maxPrice);
    }

    sql += ' ORDER BY v.created_at DESC';
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

const getVehicleById = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT v.*, u.full_name as owner_name, u.phone as owner_phone
       FROM vehicles v JOIN users u ON v.owner_id = u.id
       WHERE v.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    res.json({ success: true, data: result.rows[0] });
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

    const {
      title, brand, model, year, vehicleType, transmission, fuelType,
      seats, pricePerDay, plateNumber, description, images, features,
    } = req.body;
    const vehicleLocation = normalizeVehicleLocation(req.body);
    await enforceOwnerVehicleLimit(req.user.id);

    const proofPhotos = getProofPhotosFromRequest(req);
    validateProofPhotos(proofPhotos, true);
    const vehicleImages = buildGalleryImages(proofPhotos);

    const result = await query(
      `INSERT INTO vehicles (owner_id, title, brand, model, plate_number, year, vehicle_type, transmission,
        fuel_type, seats, price_per_day, location, city, barangay, pickup_address,
        latitude, longitude, description, images, proof_photos, features)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       RETURNING *`,
      [
        req.user.id, title, brand, model, plateNumber || null, year, vehicleType, transmission,
        fuelType, seats || 4, pricePerDay, vehicleLocation.location, vehicleLocation.city,
        vehicleLocation.barangay, vehicleLocation.pickupAddress, vehicleLocation.latitude,
        vehicleLocation.longitude, description || null,
        vehicleImages, JSON.stringify(proofPhotos), features || [],
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
      'fuel_type', 'seats', 'price_per_day', 'location', 'city', 'barangay',
      'pickup_address', 'latitude', 'longitude', 'description', 'images', 'proof_photos', 'features', 'status'];
    const mapping = {
      vehicleType: 'vehicle_type', pricePerDay: 'price_per_day', fuelType: 'fuel_type',
      pickupAddress: 'pickup_address', plateNumber: 'plate_number', proofPhotos: 'proof_photos',
    };
    const bodyData = { ...req.body };
    const existingProof = typeof vehicle.rows[0].proof_photos === 'object'
      ? vehicle.rows[0].proof_photos
      : (vehicle.rows[0].proof_photos ? JSON.parse(vehicle.rows[0].proof_photos) : {});

    const mergedProof = getProofPhotosFromRequest(req, existingProof);
    const hasNewProofUploads = Object.keys(PROOF_FIELD_MAP).some((field) => req.files?.[field]?.[0]);

    if (hasNewProofUploads) {
      bodyData.proof_photos = mergedProof;
      bodyData.images = buildGalleryImages(mergedProof);
    }

    if (bodyData.location !== undefined || bodyData.city !== undefined) {
      const vehicleLocation = normalizeVehicleLocation(bodyData);
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

const vehicleValidation = [
  body('title').trim().notEmpty(),
  body('brand').trim().notEmpty(),
  body('model').trim().notEmpty(),
  body('plateNumber').optional().trim(),
  body('year').isInt({ min: 1990, max: new Date().getFullYear() + 1 }),
  body('vehicleType').trim().notEmpty().isIn(VEHICLE_TYPES).withMessage('Invalid vehicle type'),
  body('transmission').trim().notEmpty(),
  body('fuelType').trim().notEmpty(),
  body('pricePerDay').isFloat({ min: 0 }),
  body('city').optional().isIn(CEBU_LOCATIONS).withMessage('City must be in Cebu only'),
  body('location').optional().isIn(CEBU_LOCATIONS).withMessage('Location must be in Cebu only'),
  body().custom((value) => {
    const city = value.city || value.location;
    if (!city || !CEBU_LOCATIONS.includes(city)) {
      throw new Error('Vehicle location must be within Cebu City or Cebu Province.');
    }
    return true;
  }),
];

module.exports = {
  getVehicles, getVehicleById, createVehicle, updateVehicle,
  deleteVehicle, getOwnerVehicles, vehicleValidation,
};
