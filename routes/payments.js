const express = require('express');
const router = express.Router();
const {
  initiateMpesa,
  mpesaCallback,
  submitManualPayment,
  getPaymentStatus,
  getPaymentHistory,
  getWallet,
  requestWithdrawal
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

router.post('/mpesa/initiate', protect, initiateMpesa);
router.post('/mpesa/callback', mpesaCallback);
router.post('/manual', protect, submitManualPayment);
router.get('/status/:id', protect, getPaymentStatus);
router.get('/history', protect, getPaymentHistory);
router.get('/wallet', protect, getWallet);
router.post('/withdraw', protect, requestWithdrawal);

module.exports = router;
