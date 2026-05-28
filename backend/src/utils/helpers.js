const { v4: uuidv4 } = require('uuid');

const generateInvoiceNumber = () => {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `JLR-${y}${m}${d}-${rand}`;
};

const generateReferenceNumber = (method) => {
  const prefix = method === 'gcash' ? 'GC' : method === 'card' ? 'CC' : 'PY';
  return `${prefix}${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
};

const calculateDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(diff, 1);
};

const sanitizeUser = (user) => {
  const { password_hash, ...safe } = user;
  return safe;
};

const calculateCommission = (amount, percentage) => {
  const platformAmount = Math.round((amount * percentage / 100) * 100) / 100;
  const ownerAmount = Math.round((amount - platformAmount) * 100) / 100;
  return { platformAmount, ownerAmount, commissionPercentage: percentage };
};

module.exports = {
  generateInvoiceNumber,
  generateReferenceNumber,
  calculateDays,
  sanitizeUser,
  calculateCommission,
};
