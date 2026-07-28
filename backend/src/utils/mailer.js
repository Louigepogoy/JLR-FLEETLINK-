const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

const sendOtpEmail = async (to, code) => {
  await transporter.sendMail({
    from: `"JLR Fleetlink" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Your JLR Fleetlink login code',
    text: `Your login verification code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
    html: `<p>Your login verification code is <strong style="font-size:20px">${code}</strong>.</p><p>It expires in 10 minutes. If you did not request this, ignore this email.</p>`,
  });
};

const sendPasswordResetEmail = async (to, code) => {
  await transporter.sendMail({
    from: `"JLR Fleetlink" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Reset your JLR Fleetlink password',
    text: `Your password reset code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
    html: `<p>Your password reset code is <strong style="font-size:20px">${code}</strong>.</p><p>It expires in 10 minutes. If you did not request this, ignore this email.</p>`,
  });
};

module.exports = { sendOtpEmail, sendPasswordResetEmail };
