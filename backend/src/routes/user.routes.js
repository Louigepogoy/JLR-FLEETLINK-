const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { uploadProfileAvatar } = require('../middleware/upload');
const {
  getAllUsers, getPendingRegistrations, approveRegistration, rejectRegistration, requestMoreInfo,
  updateProfile, changePassword, toggleUserStatus, updateUserRole,
} = require('../controllers/userController');

router.get('/pending', authenticate, authorize('admin'), getPendingRegistrations);
router.patch('/:id/approve', authenticate, authorize('admin'), approveRegistration);
router.patch('/:id/reject', authenticate, authorize('admin'), rejectRegistration);
router.patch('/:id/request-info', authenticate, authorize('admin'), requestMoreInfo);
router.get('/', authenticate, authorize('admin'), getAllUsers);
router.put('/profile', authenticate, uploadProfileAvatar, updateProfile);
router.put('/profile/password', authenticate, changePassword);
router.patch('/:id/status', authenticate, authorize('admin'), toggleUserStatus);
router.patch('/:id/role', authenticate, authorize('admin'), updateUserRole);

module.exports = router;
