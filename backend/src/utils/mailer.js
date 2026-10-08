const nodemailer = require('nodemailer');

// Two ways to send mail:
// - Brevo's HTTPS API when BREVO_API_KEY is set. Hosts like Railway block outbound SMTP on their
//   cheaper plans (Gmail times out there), but HTTPS goes through.
// - Gmail SMTP otherwise (local development), with EMAIL_USER + EMAIL_APP_PASSWORD.
// The sender is EMAIL_USER in both cases (it must be a verified sender in Brevo).
const FROM_NAME = 'JLR Fleetlink';
const SEND_TIMEOUT_MS = 15000;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
  // Fail within seconds instead of hanging a request for minutes when SMTP is unreachable.
  connectionTimeout: SEND_TIMEOUT_MS,
  greetingTimeout: SEND_TIMEOUT_MS,
  socketTimeout: SEND_TIMEOUT_MS,
});

const isEmailConfigured = () =>
  Boolean(process.env.EMAIL_USER && (process.env.BREVO_API_KEY || process.env.EMAIL_APP_PASSWORD));

const sendViaBrevo = async ({ to, subject, text, html }) => {
  const recipients = (Array.isArray(to) ? to : String(to).split(','))
    .map((email) => String(email).trim())
    .filter(Boolean)
    .map((email) => ({ email }));
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: FROM_NAME, email: process.env.EMAIL_USER },
      to: recipients,
      subject,
      textContent: text,
      ...(html ? { htmlContent: html } : {}),
    }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Brevo ${response.status}: ${detail.slice(0, 200)}`);
  }
};

const sendMail = async ({ to, subject, text, html }) => {
  if (process.env.BREVO_API_KEY) return sendViaBrevo({ to, subject, text, html });
  await transporter.sendMail({ from: `"${FROM_NAME}" <${process.env.EMAIL_USER}>`, to, subject, text, html });
};

const sendPasswordResetEmail = async (to, code) => {
  await sendMail({
    to,
    subject: 'Reset your JLR Fleetlink password',
    text: `Your password reset code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
    html: `<p>Your password reset code is <strong style="font-size:20px">${code}</strong>.</p><p>It expires in 10 minutes. If you did not request this, ignore this email.</p>`,
  });
};

const sendVerificationEmail = async (to, username, code) => {
  await sendMail({
    to,
    subject: 'Verify your JLR Fleetlink email',
    text: `Hi ${username}, your JLR Fleetlink verification code is ${code}. It expires in 10 minutes. If you did not create an account, ignore this email.`,
    html: `<p>Hi ${username},</p><p>Your JLR Fleetlink verification code is <strong style="font-size:20px;letter-spacing:2px">${code}</strong>.</p><p>It expires in 10 minutes. If you did not create an account, ignore this email.</p>`,
  });
};

// Plain-text alert to the admin team (new support ticket, new report, ...). User-written text goes in
// the plain-text body only, so nothing a user typed is ever rendered as HTML.
const sendAdminAlertEmail = async (to, subject, text) => {
  await sendMail({ to, subject: `[JLR Fleetlink Admin] ${subject}`, text });
};

module.exports = { sendPasswordResetEmail, sendVerificationEmail, sendAdminAlertEmail, isEmailConfigured };
