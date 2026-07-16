const User = require('../models/User');
const Payment = require('../models/Payment');
const jwt = require('jsonwebtoken');
const SmartPayService = require('../services/smartpayService');

const smartpay = new SmartPayService();

const getUserFromToken = (req) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.id;
  } catch {
    return null;
  }
};

const initiateActivationPayment = async (req, res) => {
  try {
    const userId = getUserFromToken(req);
    if (!userId) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isActivated) {
      return res.status(400).json({ message: 'Account already activated' });
    }

    let cleanPhone = phoneNumber.replace(/\s/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '254' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('254')) {
      cleanPhone = '254' + cleanPhone;
    }

    const reference = `ACTIVATE_${userId}_${Date.now()}`;
    const paymentResponse = await smartpay.initiatePayment(cleanPhone, 50, reference, 'Account Activation');

    const transactionId = paymentResponse.checkoutRequestId || `SP-ACT-${Date.now()}-${userId.toString().slice(-6)}`;

    const payment = await Payment.create({
      userId,
      profileId: null,
      amount: 50,
      currency: 'KES',
      paymentMethod: 'smartpay',
      transactionId,
      checkoutRequestId: paymentResponse.checkoutRequestId,
      merchantRequestId: paymentResponse.merchantRequestId,
      reference,
      status: 'pending',
      metadata: { phone: cleanPhone, type: 'activation' }
    });

    pollActivationStatus(payment._id.toString(), paymentResponse.checkoutRequestId);

    res.status(201).json({
      success: true,
      message: 'Activation payment initiated. Check your phone for STK Push.',
      transactionRequestId: paymentResponse.transactionRequestId
    });
  } catch (error) {
    console.error('Activation payment initiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment initiation failed',
      error: error.message
    });
  }
};

const checkActivationStatus = async (req, res) => {
  try {
    const userId = getUserFromToken(req);
    if (!userId) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const { checkoutRequestId } = req.body;

    if (!checkoutRequestId) {
      return res.status(400).json({ message: 'Checkout Request ID is required' });
    }

    const payment = await Payment.findOne({ checkoutRequestId, userId });
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.status === 'completed') {
      const user = await User.findById(userId);
      return res.json({
        success: true,
        status: 'Completed',
        resultCode: '200',
        amount: payment.amount,
        isActivated: user?.isActivated || false
      });
    }

    if (payment.status === 'failed') {
      return res.json({
        success: true,
        status: 'Failed',
        resultCode: '400',
        amount: payment.amount
      });
    }

    const status = await smartpay.checkPaymentStatus(checkoutRequestId);

    if (status.status === 'Completed' || status.resultCode === 0) {
      await handleActivationPayment(payment._id.toString());
    }

    res.json({
      success: true,
      status: status.status,
      resultCode: status.resultCode,
      amount: status.amount
    });
  } catch (error) {
    console.error('Activation status check error:', error);
    res.status(500).json({ message: 'Status check failed' });
  }
};

async function pollActivationStatus(paymentId, checkoutRequestId) {
  const timeout = 120000;
  const startTime = Date.now();
  let completed = false;

  while (Date.now() - startTime < timeout && !completed) {
    try {
      const status = await smartpay.checkPaymentStatus(checkoutRequestId);

      if (status.status === 'Completed' || status.resultCode === 0) {
        completed = true;
        await handleActivationPayment(paymentId);
        break;
      }

      if (status.status === 'Failed') {
        completed = true;
        await Payment.findByIdAndUpdate(paymentId, { status: 'failed' });
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error('Activation polling error:', error);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  if (!completed) {
    await Payment.findByIdAndUpdate(paymentId, { status: 'timeout' });
  }
}

async function handleActivationPayment(paymentId) {
  try {
    const payment = await Payment.findById(paymentId);
    if (!payment || payment.status === 'completed') return;

    payment.status = 'completed';
    payment.completedAt = new Date();
    await payment.save();

    const user = await User.findById(payment.userId);
    if (user) {
      user.isActivated = true;
      user.walletBalance = (user.walletBalance || 0) + 500;
      user.totalEarnings = (user.totalEarnings || 0) + 500;
      await user.save();
    }

    console.log(`Activation payment ${paymentId} completed. User ${payment.userId} activated.`);
  } catch (error) {
    console.error('Error handling activation payment:', error);
  }
}

module.exports = {
  initiateActivationPayment,
  checkActivationStatus
};
