const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  verifyUser,
  suspendUser,
  getAllPayments,
  getAnalytics,
  getReports,
  updateReport,
  generateDummyProfiles,
  getDummyProfiles
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/users', protect, adminOnly, getAllUsers);
router.put('/users/:id/verify', protect, adminOnly, verifyUser);
router.put('/users/:id/suspend', protect, adminOnly, suspendUser);
router.get('/payments', protect, adminOnly, getAllPayments);
router.get('/analytics', protect, adminOnly, getAnalytics);
router.get('/reports', protect, adminOnly, getReports);
router.put('/reports/:id', protect, adminOnly, updateReport);
router.get('/dummy-profiles', protect, adminOnly, getDummyProfiles);
router.post('/dummy-profiles/bulk', protect, adminOnly, generateDummyProfiles);

module.exports = router;
