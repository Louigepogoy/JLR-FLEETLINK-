const { query } = require('../config/db');

const getNotifications = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    const unread = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );
    res.json({
      success: true,
      data: result.rows,
      unreadCount: parseInt(unread.rows[0].count),
    });
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    await query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead };
