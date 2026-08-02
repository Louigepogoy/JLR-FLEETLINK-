const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');
const { createNotification } = require('../utils/notifications');

const submitVerificationValidation = [
  body('licenseNumber').trim().notEmpty().withMessage('Driver\'s license number is required'),
];

const getVerificationStatus = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT approval_status, rejection_reason, license_number FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const submitVerification = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const licenseFile = req.files?.licenseImage?.[0];
    const selfieFile = req.files?.selfieImage?.[0];

    if (!licenseFile || !selfieFile) {
      return res.status(400).json({
        success: false,
        message: 'Valid driver\'s license photo and live selfie are required for verification',
      });
    }

    const current = await query('SELECT approval_status FROM users WHERE id = $1', [req.user.id]);
    if (['pending', 'approved'].includes(current.rows[0]?.approval_status)) {
      return res.status(409).json({
        success: false,
        message: current.rows[0].approval_status === 'approved'
          ? 'Your identity is already verified.'
          : 'Your verification is already under review.',
      });
    }

    const { licenseNumber } = req.body;
    const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const licenseImageUrl = `${baseUrl}/uploads/${licenseFile.filename}`;
    const selfieImageUrl = `${baseUrl}/uploads/${selfieFile.filename}`;

    const result = await query(
      `UPDATE users SET
         license_number = $1,
         license_image_url = $2,
         selfie_image_url = $3,
         approval_status = 'pending',
         rejection_reason = NULL,
         updated_at = NOW()
       WHERE id = $4
       RETURNING id, full_name, approval_status`,
      [licenseNumber, licenseImageUrl, selfieImageUrl, req.user.id]
    );

    const user = result.rows[0];

    const admins = await query("SELECT id FROM users WHERE role = 'admin' AND is_active = true");
    await Promise.all(
      admins.rows.map((admin) =>
        createNotification(
          admin.id,
          'New Identity Verification Submitted',
          `${user.full_name} submitted a driver's license for verification. License: ${licenseNumber}.`,
          'alert',
          '/dashboard/admin/approvals'
        )
      )
    );

    res.json({
      success: true,
      message: 'Verification submitted. We\'ll review it shortly.',
      data: { approval_status: user.approval_status },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getVerificationStatus, submitVerification, submitVerificationValidation };
