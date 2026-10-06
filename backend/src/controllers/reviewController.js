const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');
const { createNotification } = require('../utils/notifications');
const { containsProfanity } = require('../utils/profanity');

// Ratings can be left for this long after a booking is completed, then the prompt stops appearing.
const REVIEW_WINDOW_DAYS = 30;
const RECENT_REVIEWS_LIMIT = 20;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Completed bookings the current user took part in (as customer or owner) and hasn't rated yet.
const PENDING_REVIEWS_SQL = `
  SELECT b.id AS booking_id, b.start_date, b.end_date, COALESCE(b.completed_at, b.updated_at) AS completed_at,
         v.id AS vehicle_id, v.title AS vehicle_title, v.brand, v.model, v.images[1] AS vehicle_image,
         CASE WHEN b.customer_id = $1 THEN 'customer' ELSE 'owner' END AS my_role,
         other.id AS other_id, other.full_name AS other_name, other.avatar_url AS other_avatar_url
  FROM bookings b
  JOIN vehicles v ON v.id = b.vehicle_id
  JOIN users other ON other.id = CASE WHEN b.customer_id = $1 THEN v.owner_id ELSE b.customer_id END
  WHERE b.status = 'completed'
    AND (b.customer_id = $1 OR v.owner_id = $1)
    AND b.customer_id <> v.owner_id
    AND COALESCE(b.completed_at, b.updated_at) > NOW() - INTERVAL '${REVIEW_WINDOW_DAYS} days'
    AND NOT EXISTS (SELECT 1 FROM booking_reviews r WHERE r.booking_id = b.id AND r.reviewer_id = $1)`;

const getPendingReviews = async (req, res, next) => {
  try {
    const result = await query(`${PENDING_REVIEWS_SQL} ORDER BY completed_at DESC`, [req.user.id]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

const createReview = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
    }

    const { bookingId, userRating, vehicleRating } = req.body;
    const comment = (req.body.comment || '').trim() || null;

    const pending = await query(`${PENDING_REVIEWS_SQL} AND b.id = $2`, [req.user.id, bookingId]);
    const booking = pending.rows[0];
    if (!booking) {
      const already = await query(
        'SELECT 1 FROM booking_reviews WHERE booking_id = $1 AND reviewer_id = $2',
        [bookingId, req.user.id]
      );
      return res.status(already.rows.length ? 409 : 400).json({
        success: false,
        message: already.rows.length
          ? 'You already rated this booking'
          : 'Only completed bookings you were part of can be rated (within 30 days of completion)',
      });
    }

    const isCustomer = booking.my_role === 'customer';
    if (isCustomer && !vehicleRating) {
      return res.status(400).json({ success: false, message: 'Please rate the vehicle too' });
    }
    if (comment && containsProfanity(comment)) {
      return res.status(400).json({ success: false, message: 'Your review contains bad words. Please keep it respectful.' });
    }

    const result = await query(
      `INSERT INTO booking_reviews
         (booking_id, reviewer_id, reviewee_id, vehicle_id, reviewer_role, user_rating, vehicle_rating, comment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [bookingId, req.user.id, booking.other_id, isCustomer ? booking.vehicle_id : null, booking.my_role,
        userRating, isCustomer ? vehicleRating : null, comment]
    );

    await createNotification(
      booking.other_id,
      `You received a ${userRating}★ rating`,
      `${req.user.full_name} rated you ${userRating}/5 for the ${booking.vehicle_title} rental.`,
      'system',
      `/users/${booking.other_id}`
    ).catch(() => {});

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const summarize = (row) => ({
  average: row.average === null ? null : Number(row.average),
  count: row.count,
});

const getVehicleReviews = async (req, res, next) => {
  try {
    if (!UUID_PATTERN.test(req.params.id)) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    const [summary, reviews] = await Promise.all([
      query(
        `SELECT ROUND(AVG(vehicle_rating)::numeric, 1) AS average, COUNT(*)::int AS count
         FROM booking_reviews WHERE vehicle_id = $1`,
        [req.params.id]
      ),
      query(
        `SELECT r.id, r.vehicle_rating AS rating, r.comment, r.created_at,
                u.id AS reviewer_id, u.full_name AS reviewer_name, u.avatar_url AS reviewer_avatar_url
         FROM booking_reviews r JOIN users u ON u.id = r.reviewer_id
         WHERE r.vehicle_id = $1 ORDER BY r.created_at DESC LIMIT $2`,
        [req.params.id, RECENT_REVIEWS_LIMIT]
      ),
    ]);
    res.json({ success: true, data: { ...summarize(summary.rows[0]), reviews: reviews.rows } });
  } catch (error) {
    next(error);
  }
};

const getUserReviews = async (req, res, next) => {
  try {
    if (!UUID_PATTERN.test(req.params.id)) return res.status(404).json({ success: false, message: 'User not found' });
    const [summary, reviews] = await Promise.all([
      query(
        `SELECT ROUND(AVG(user_rating)::numeric, 1) AS average, COUNT(*)::int AS count
         FROM booking_reviews WHERE reviewee_id = $1`,
        [req.params.id]
      ),
      query(
        `SELECT r.id, r.user_rating AS rating, r.comment, r.created_at,
                -- The reviewee's role in that rental: reviewed by the customer means they were the owner.
                CASE WHEN r.reviewer_role = 'customer' THEN 'owner' ELSE 'renter' END AS reviewee_role,
                v.title AS vehicle_title,
                u.id AS reviewer_id, u.full_name AS reviewer_name, u.avatar_url AS reviewer_avatar_url
         FROM booking_reviews r
         JOIN users u ON u.id = r.reviewer_id
         JOIN bookings b ON b.id = r.booking_id
         JOIN vehicles v ON v.id = b.vehicle_id
         WHERE r.reviewee_id = $1 ORDER BY r.created_at DESC LIMIT $2`,
        [req.params.id, RECENT_REVIEWS_LIMIT]
      ),
    ]);
    res.json({ success: true, data: { ...summarize(summary.rows[0]), reviews: reviews.rows } });
  } catch (error) {
    next(error);
  }
};

// Home page "Reviews" section: the latest renter reviews of vehicles that include a written comment,
// plus the platform-wide average vehicle rating. Public, like listings.
const HOME_REVIEWS_LIMIT = 6;
const getRecentReviews = async (req, res, next) => {
  try {
    const [summary, reviews] = await Promise.all([
      query(
        `SELECT ROUND(AVG(vehicle_rating)::numeric, 1) AS average, COUNT(*)::int AS count
         FROM booking_reviews WHERE reviewer_role = 'customer'`
      ),
      query(
        `SELECT r.id, r.vehicle_rating AS rating, r.comment, r.created_at,
                v.id AS vehicle_id, v.title AS vehicle_title, v.city, v.province,
                u.id AS reviewer_id, u.full_name AS reviewer_name, u.avatar_url AS reviewer_avatar_url
         FROM booking_reviews r
         JOIN users u ON u.id = r.reviewer_id
         JOIN vehicles v ON v.id = r.vehicle_id
         WHERE r.reviewer_role = 'customer' AND r.comment IS NOT NULL AND btrim(r.comment) <> ''
         ORDER BY r.created_at DESC LIMIT $1`,
        [HOME_REVIEWS_LIMIT]
      ),
    ]);
    res.json({ success: true, data: { ...summarize(summary.rows[0]), reviews: reviews.rows } });
  } catch (error) {
    next(error);
  }
};

const reviewValidation = [
  body('bookingId').matches(UUID_PATTERN).withMessage('Invalid booking').customSanitizer((v) => String(v).toLowerCase()),
  body('userRating').isInt({ min: 1, max: 5 }).withMessage('Please choose 1 to 5 stars').toInt(),
  body('vehicleRating').optional({ values: 'null' }).isInt({ min: 1, max: 5 }).withMessage('Please choose 1 to 5 stars for the vehicle').toInt(),
  body('comment').optional({ values: 'null' }).isString().isLength({ max: 1000 }).withMessage('Review is too long (max 1000 characters)'),
];

module.exports = {
  getPendingReviews, createReview, getVehicleReviews, getUserReviews, getRecentReviews, reviewValidation,
};
