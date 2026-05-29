const errorHandler = (err, req, res, next) => {
  console.error(err.stack || err.message);

  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return res.status(503).json({
      success: false,
      message: 'Database unavailable. Check DATABASE_URL in backend/.env and run npm run db:setup',
    });
  }

  if (err.code === '42P01') {
    return res.status(503).json({
      success: false,
      message: 'Database tables missing. Run: cd backend && npm run db:setup',
    });
  }

  if (err.code === '42703') {
    return res.status(503).json({
      success: false,
      message: 'Database schema outdated. Run: cd backend && npm run db:setup',
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: err.message, errors: err.errors });
  }

  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'Resource already exists' });
  }

  if (err.message?.includes('already booked')) {
    return res.status(409).json({ success: false, message: err.message });
  }

  if (err.upgradeRequired) {
    return res.status(err.status || 403).json({
      success: false,
      message: err.message,
      upgradeRequired: true,
      currentCount: err.currentCount,
      vehicleLimit: err.vehicleLimit,
      planId: err.planId,
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
};

module.exports = errorHandler;
