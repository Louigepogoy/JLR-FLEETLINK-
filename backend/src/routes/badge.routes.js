const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getSidebarBadges, markSeen } = require('../controllers/badgeController');

router.get('/', authenticate, getSidebarBadges);
router.post('/seen', authenticate, markSeen);

module.exports = router;
