const { query } = require('../config/db');

const recordLoginAttempt = async ({ req, email, success, reason, userId = null }) => {
  try {
    await query(
      `INSERT INTO login_logs (user_id, email, success, reason, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, email, success, reason, req.ip, req.headers['user-agent'] || null]
    );
  } catch (error) {
    console.error('Failed to record login attempt:', error.message);
  }
};

module.exports = { recordLoginAttempt };
