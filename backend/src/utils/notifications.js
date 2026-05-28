const { query } = require('../config/db');

const createNotification = async (userId, title, message, type = 'system', link = null) => {
  await query(
    `INSERT INTO notifications (user_id, title, message, type, link)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, title, message, type, link]
  );
};

module.exports = { createNotification };
