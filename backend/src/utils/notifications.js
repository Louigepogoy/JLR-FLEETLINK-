const { query } = require('../config/db');
const { sendAdminAlertEmail } = require('./mailer');

const createNotification = async (userId, title, message, type = 'system', link = null) => {
  await query(
    `INSERT INTO notifications (user_id, title, message, type, link)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, title, message, type, link]
  );
};

/**
 * Alerts every active admin: an in-app notification (bell) for each, plus an email when the mailer is
 * configured. Any admin can then pick the item up, so nothing waits on one particular admin. Never
 * throws — a failed alert must not fail the user's submission.
 */
const notifyAdmins = async (title, message, type = 'alert', link = null, emailText = message) => {
  try {
    const admins = await query("SELECT id, email FROM users WHERE role = 'admin' AND is_active = true");
    await Promise.all(admins.rows.map((admin) =>
      createNotification(admin.id, title, message, type, link)
        .catch((err) => console.error('Admin notification failed:', err.message))
    ));

    const emails = admins.rows.map((admin) => admin.email).filter(Boolean);
    if (emails.length && process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
      const url = link && process.env.FRONTEND_URL ? `\n\nOpen: ${process.env.FRONTEND_URL}${link}` : '';
      // Not awaited: sending mail is slow and shouldn't delay the user's response.
      sendAdminAlertEmail(emails, title, `${emailText}${url}`)
        .catch((err) => console.error('Admin alert email failed:', err.message));
    }
  } catch (err) {
    console.error('Notifying admins failed:', err.message);
  }
};

module.exports = { createNotification, notifyAdmins };
