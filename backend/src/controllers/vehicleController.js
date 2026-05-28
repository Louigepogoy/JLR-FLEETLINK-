const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');

const getVehicles = async (req, res, next) => {
  try {
    const { search, type, minPrice, maxPrice, location, status = 'available' } = req.query;
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
      sql += ` AND v.location ILIKE $${idx++}`;
      params.push(`%${location}%`);
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
      seats, pricePerDay, location, description, images, features,
    } = req.body;

    const result = await query(
      `INSERT INTO vehicles (owner_id, title, brand, model, year, vehicle_type, transmission,
        fuel_type, seats, price_per_day, location, description, images, features)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        req.user.id, title, brand, model, year, vehicleType, transmission,
        fuelType, seats || 4, pricePerDay, location, description || null,
        images || [], features || [],
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

    const fields = ['title', 'brand', 'model', 'year', 'vehicle_type', 'transmission',
      'fuel_type', 'seats', 'price_per_day', 'location', 'description', 'images', 'features', 'status'];
    const mapping = {
      vehicleType: 'vehicle_type', pricePerDay: 'price_per_day', fuelType: 'fuel_type',
    };

    const updates = [];
    const values = [];
    let i = 1;

    Object.entries(req.body).forEach(([key, val]) => {
      const col = mapping[key] || key;
      if (fields.includes(col) && val !== undefined) {
        updates.push(`${col} = $${i++}`);
        values.push(val);
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
  body('year').isInt({ min: 1990, max: new Date().getFullYear() + 1 }),
  body('vehicleType').trim().notEmpty(),
  body('transmission').trim().notEmpty(),
  body('fuelType').trim().notEmpty(),
  body('pricePerDay').isFloat({ min: 0 }),
  body('location').trim().notEmpty(),
];

module.exports = {
  getVehicles, getVehicleById, createVehicle, updateVehicle,
  deleteVehicle, getOwnerVehicles, vehicleValidation,
};
