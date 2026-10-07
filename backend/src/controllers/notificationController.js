const { query } = require('../config/db');

const getNotifications = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    // unseen: unread and newer than the last time the user opened the bell — that's the bell badge,
    // so it clears as soon as the list has been looked at (items stay unread until clicked).
    const unread = await query(
      `SELECT COUNT(*) AS unread,
              COUNT(*) FILTER (WHERE created_at > COALESCE(
                (SELECT seen_at FROM user_seen_markers WHERE user_id = $1 AND marker_key = 'notifications'),
                'epoch'::timestamptz)) AS unseen
       FROM notifications WHERE user_id = $1 AND is_read = false`,
      [req.user.id]
    );
    res.json({
      success: true,
      data: result.rows,
      unreadCount: parseInt(unread.rows[0].unread),
      unseenCount: parseInt(unread.rows[0].unseen),
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
