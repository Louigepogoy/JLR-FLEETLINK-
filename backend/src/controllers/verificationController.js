const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');
const { createNotification } = require('../utils/notifications');
const { canList } = require('../utils/helpers');

// Business documents an owner can submit as proof of business.
const BUSINESS_PROOF_TYPES = {
  dti: 'DTI Business Name Registration',
  mayors_permit: "Mayor's / Business Permit",
  sec: 'SEC Registration',
  bir_2303: 'BIR Certificate of Registration (Form 2303)',
};

const submitVerificationValidation = [
  body('licenseNumber').trim().notEmpty().withMessage('Driver\'s license number is required'),
];

const getVerificationStatus = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT approval_status, rejection_reason, license_number, account_type, business_name,
              business_proof_url IS NOT NULL AS has_business_proof, business_proof_type
       FROM users WHERE id = $1`,
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
    // Owners must also prove their business and that they have a vehicle (its OR/CR). Customers don't.
    const isOwner = canList(req.user);
    const businessFile = isOwner ? req.files?.businessProof?.[0] : null;
    const businessName = isOwner ? String(req.body.businessName || '').trim().slice(0, 255) || null : null;
    const businessType = isOwner && BUSINESS_PROOF_TYPES[req.body.businessProofType] ? req.body.businessProofType : null;
    const orFile = isOwner ? req.files?.ownerOr?.[0] : null;
    const crFile = isOwner ? req.files?.ownerCr?.[0] : null;
    if (isOwner) {
      const missing = [
        !businessType && 'business document type',
        !businessName && 'business name',
        !businessFile && 'business proof photo',
        !orFile && 'OR (Official Receipt)',
        !crFile && 'CR (Certificate of Registration)',
      ].filter(Boolean);
      if (missing.length) {
        return res.status(400).json({
          success: false,
          message: `Owner verification also needs your business proof and your vehicle's OR/CR. Missing: ${missing.join(', ')}.`,
        });
      }
    }

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
    const businessProofUrl = businessFile ? `${baseUrl}/uploads/${businessFile.filename}` : null;
    const ownerOrUrl = orFile ? `${baseUrl}/uploads/${orFile.filename}` : null;
    const ownerCrUrl = crFile ? `${baseUrl}/uploads/${crFile.filename}` : null;

    const result = await query(
      `UPDATE users SET
         license_number = $1,
         license_image_url = $2,
         selfie_image_url = $3,
         business_name = $5,
         business_proof_url = $6,
         business_proof_type = $7,
         owner_or_url = $8,
         owner_cr_url = $9,
         approval_status = 'pending',
         rejection_reason = NULL,
         updated_at = NOW()
       WHERE id = $4
       RETURNING id, full_name, approval_status`,
      [licenseNumber, licenseImageUrl, selfieImageUrl, req.user.id, businessName, businessProofUrl, businessType, ownerOrUrl, ownerCrUrl]
    );

    const user = result.rows[0];

    const admins = await query("SELECT id FROM users WHERE role = 'admin' AND is_active = true");
    await Promise.all(
      admins.rows.map((admin) =>
        createNotification(
          admin.id,
          'New Identity Verification Submitted',
          `${user.full_name} (${req.user.account_type === 'owner' ? 'Owner' : req.user.account_type === 'customer' ? 'Customer' : 'User'}) submitted a driver's license${businessProofUrl ? `, ${BUSINESS_PROOF_TYPES[businessType]}, and vehicle OR/CR` : ''} for verification. License: ${licenseNumber}.`,
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
