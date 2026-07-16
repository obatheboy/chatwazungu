const express = require('express');
const router = express.Router();
const {
  initiateMpesa,
  mpesaCallback,
  submitManualPayment,
  getPaymentStatus,
  getPaymentHistory,
  getWallet,
  requestWithdrawal,
  initiateSmartPayPayment,
  checkSmartPayStatus
} = require('../controllers/paymentController');
const {
  initiateActivationPayment,
  checkActivationStatus
} = require('../controllers/activationController');
const { protect } = require('../middleware/auth');

router.post('/mpesa/initiate', protect, initiateMpesa);
router.post('/mpesa/callback', mpesaCallback);
router.post('/manual', protect, submitManualPayment);
router.get('/status/:id', protect, getPaymentStatus);
router.get('/history', protect, getPaymentHistory);
router.get('/wallet', protect, getWallet);
router.post('/withdraw', protect, requestWithdrawal);
router.post('/smartpay/initiate', protect, initiateSmartPayPayment);
router.post('/smartpay/status', protect, checkSmartPayStatus);
router.post('/activation/initiate', initiateActivationPayment);
router.post('/activation/status', checkActivationStatus);

module.exports = router;
