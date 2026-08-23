const { query } = require('../config/db');
const { analyzeLicenseVerification, analyzeVehiclePhotos } = require('../services/aiVerificationService');

const saveAiResult = (subjectType, subjectId, result) =>
  query(
    `INSERT INTO ai_verification_results (subject_type, subject_id, risk_score, verdict, reasons, summary, model)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [subjectType, subjectId, result.riskScore, result.verdict, JSON.stringify(result.reasons), result.summary, result.model]
  );

const runLicenseAnalysis = async (req, res, next) => {
  try {
    const userResult = await query(
      'SELECT full_name, license_number, license_image_url, selfie_image_url FROM users WHERE id = $1',
      [req.params.userId]
    );
    if (!userResult.rows[0]) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const user = userResult.rows[0];

    const result = await analyzeLicenseVerification({
      licenseImageUrl: user.license_image_url,
      selfieImageUrl: user.selfie_image_url,
      licenseNumber: user.license_number,
      fullName: user.full_name,
    });

    await saveAiResult('license', req.params.userId, result);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const runVehicleAnalysis = async (req, res, next) => {
  try {
    const vehicleResult = await query(
      'SELECT title, brand, model, vehicle_type, plate_number, images FROM vehicles WHERE id = $1',
      [req.params.vehicleId]
    );
    if (!vehicleResult.rows[0]) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    const vehicle = vehicleResult.rows[0];

    const result = await analyzeVehiclePhotos({
      imageUrls: vehicle.images,
      title: vehicle.title,
      brand: vehicle.brand,
      model: vehicle.model,
      vehicleType: vehicle.vehicle_type,
      plateNumber: vehicle.plate_number,
    });

    await saveAiResult('vehicle', req.params.vehicleId, result);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = { runLicenseAnalysis, runVehicleAnalysis };
