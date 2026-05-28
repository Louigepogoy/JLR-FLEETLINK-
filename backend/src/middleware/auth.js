const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await query(
      `SELECT id, email, full_name, phone, role, avatar_url, is_active, approval_status
       FROM users WHERE id = $1`,
      [decoded.userId]
    );

    if (!result.rows[0]) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const user = result.rows[0];
    if (
      user.role !== 'admin' &&
      user.approval_status &&
      user.approval_status !== 'approved'
    ) {
      return res.status(403).json({ success: false, message: 'Account not approved' });
    }

    if (!user.is_active) {
      return res.status(401).json({ success: false, message: 'Account inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
};

module.exports = { authenticate, authorize };
