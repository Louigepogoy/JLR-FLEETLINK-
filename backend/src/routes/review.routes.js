const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getPendingReviews, createReview, getVehicleReviews, getUserReviews, getRecentReviews, reviewValidation,
} = require('../controllers/reviewController');

router.get('/pending', authenticate, getPendingReviews);
router.post('/', authenticate, reviewValidation, createReview);
// Public, like listings and profiles.
router.get('/recent', getRecentReviews);
router.get('/vehicle/:id', getVehicleReviews);
router.get('/user/:id', getUserReviews);

module.exports = router;
