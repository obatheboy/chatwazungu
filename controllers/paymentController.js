const User = require('../models/User');
const Payment = require('../models/Payment');
const UnlockedProfile = require('../models/UnlockedProfile');
const Chat = require('../models/Chat');
const crypto = require('crypto');
const SmartPayService = require('../services/smartpayService');

const fixPhotoUrl = (url) => {
  if (!url) return url;
  if (url.includes('/images/images/')) return url.replace(/\/images\/images\//g, '/images/');
  if (url.startsWith('/cache/profiles/')) {
    const file = url.replace('/cache/profiles/', '');
    return `https://chat-wazungu-e1ix.onrender.com/images/${file}`;
  }
  return url;
};

const smartpay = new SmartPayService();

const initiateSmartPayPayment = async (req, res) => {
  try {
    const { profileId, phoneNumber } = req.body;
    const userId = req.user.id;

    if (!profileId || !phoneNumber) {
      return res.status(400).json({ message: 'Profile ID and phone number are required' });
    }

    const profile = await User.findById(profileId);
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const existingPayment = await Payment.findOne({
      userId,
      profileId,
      status: 'completed'
    });
    if (existingPayment) {
      return res.status(400).json({ message: 'Profile already unlocked' });
    }

    let cleanPhone = phoneNumber.replace(/\s/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '254' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('254')) {
      cleanPhone = '254' + cleanPhone;
    }

    const reference = `CHAT_${userId}_${profileId}_${Date.now()}`;
    const paymentResponse = await smartpay.initiatePayment(cleanPhone, 99, reference, `Unlock ${profile.fullName} on ChatWazungu`);

    const transactionId = paymentResponse.checkoutRequestId || `SP-${Date.now()}-${userId.toString().slice(-6)}`;

    const payment = await Payment.create({
      userId,
      profileId,
      amount: 99,
      currency: 'KES',
      paymentMethod: 'smartpay',
      transactionId,
      checkoutRequestId: paymentResponse.checkoutRequestId,
      merchantRequestId: paymentResponse.merchantRequestId,
      reference,
      status: 'pending',
      metadata: { phone: cleanPhone }
    });

    pollSmartPayStatus(payment._id.toString(), paymentResponse.checkoutRequestId);

    res.status(201).json({
      success: true,
      message: 'M-Pesa STK Push sent successfully',
      checkoutRequestId: paymentResponse.checkoutRequestId
    });
  } catch (error) {
    console.error('SmartPay initiation error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Payment initiation failed',
      raw: error.raw || null
    });
  }
};

const checkSmartPayStatus = async (req, res) => {
  try {
    const { checkoutRequestId } = req.body;

    if (!checkoutRequestId) {
      return res.status(400).json({ message: 'Checkout Request ID is required' });
    }

    const payment = await Payment.findOne({ checkoutRequestId });
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.status === 'completed') {
      return res.json({
        success: true,
        status: 'Completed',
        resultCode: '0',
        amount: payment.amount
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

    console.log('SmartPay status response:', status);

    res.json({
      success: true,
      status: status.status,
      resultCode: status.resultCode,
      amount: status.amount
    });
  } catch (error) {
    console.error('SmartPay status check error:', error);
    res.status(500).json({ message: 'Status check failed' });
  }
};

async function pollSmartPayStatus(paymentId, checkoutRequestId) {
  const timeout = 120000;
  const startTime = Date.now();
  let completed = false;

  while (Date.now() - startTime < timeout && !completed) {
    try {
      const status = await smartpay.checkPaymentStatus(checkoutRequestId);

      if (status.status === 'Completed' || status.resultCode === 0) {
        completed = true;
        await handleSuccessfulPayment(paymentId);
        break;
      }

      if (status.status === 'Failed') {
        completed = true;
        await Payment.findByIdAndUpdate(paymentId, { status: 'failed' });
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error('SmartPay polling error:', error);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  if (!completed) {
    await Payment.findByIdAndUpdate(paymentId, { status: 'timeout' });
  }
}

async function handleSuccessfulPayment(paymentId) {
  try {
    const payment = await Payment.findById(paymentId);
    if (!payment || payment.status === 'completed') return;

    payment.status = 'completed';
    payment.completedAt = new Date();
    await payment.save();

    await unlockProfileForUser(payment.userId.toString(), payment.profileId.toString());

    const chat = await Chat.create({
      userId: payment.userId,
      profileId: payment.profileId,
      messages: []
    });

    const profile = await User.findById(payment.profileId);
    if (profile) {
      const welcomeMessage = `Hey there! I'm ${profile.fullName} 😏 I've been waiting for you to message me! What's up?`;

      await Chat.findByIdAndUpdate(chat._id, {
        $push: {
          messages: {
            sender: 'ai',
            content: welcomeMessage,
            timestamp: new Date(),
            isRead: false
          }
        }
      });
    }

    console.log(`✅ SmartPay payment ${paymentId} completed. Chat ${chat._id} activated.`);
  } catch (error) {
    console.error('Error handling successful payment:', error);
  }
}

const initiateMpesa = async (req, res) => {
  try {
    const { profileId, phoneNumber, amount = 99 } = req.body;
    const userId = req.user.id;

    if (!profileId || !phoneNumber) {
      return res.status(400).json({ message: 'Profile ID and phone number are required' });
    }

    const profile = await User.findById(profileId);
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const transactionId = `MPESA-${Date.now()}-${userId.toString().slice(-6)}`;
    const checkoutRequestId = `ws_CO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const payment = await Payment.create({
      userId,
      profileId,
      amount: parseFloat(amount),
      currency: 'KES',
      paymentMethod: 'mpesa',
      transactionId,
      checkoutRequestId,
      status: 'pending',
      metadata: { phoneNumber }
    });

    if (process.env.MPESA_ENV === 'live') {
      const mpesaResponse = await initiateSTKPush({
        phoneNumber,
        amount: parseFloat(amount),
        accountReference: `Unlock-${profile.fullName}`,
        transactionDesc: `Unlock ${profile.fullName} on ChatWazungu`,
        checkoutRequestId
      });

      payment.metadata = { ...payment.metadata, mpesaResponse };
      await payment.save();
    }

    res.status(201).json({
      success: true,
      message: process.env.MPESA_ENV === 'live' 
        ? 'M-Pesa STK Push initiated. Check your phone.' 
        : 'Payment initiated (demo mode)',
      payment: {
        id: payment._id,
        transactionId,
        amount,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const mpesaCallback = async (req, res) => {
  try {
    const callback = req.body;
    const checkoutRequestId = callback.Body?.stkCallback?.MerchantRequestID || callback.CheckoutRequestID;

    if (checkoutRequestId) {
      const payment = await Payment.findOne({ checkoutRequestId });
      if (payment) {
        const resultCode = callback.Body?.stkCallback?.ResultCode;
        payment.status = resultCode === 0 ? 'completed' : 'failed';
        payment.metadata = { ...payment.metadata, callback };

         if (resultCode === 0) {
           payment.completedAt = new Date();

           await unlockProfileForUser(payment.userId, payment.profileId);
         }
        await payment.save();
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getPaymentStatus = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    res.json({
      success: true,
      payment
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const payments = await Payment.find({ userId })
      .populate('profileId', 'fullName profilePhoto category')
      .sort({ createdAt: -1 });

    const fixedPayments = payments.map(p => {
      const pObj = p.toObject();
      if (pObj.profileId) {
        pObj.profileId.profilePhoto = fixPhotoUrl(pObj.profileId.profilePhoto);
      }
      return pObj;
    });

    res.json({
      success: true,
      payments: fixedPayments
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    const unlocked = await UnlockedProfile.find({ userId, isActive: true })
      .populate('unlockedUserId', 'fullName profilePhoto category bio onlineStatus lastSeen')
      .sort({ createdAt: -1 });

    const fixedUnlocked = unlocked.map(u => {
      const uObj = u.toObject();
      if (uObj.unlockedUserId) {
        uObj.unlockedUserId.profilePhoto = fixPhotoUrl(uObj.unlockedUserId.profilePhoto);
      }
      return uObj;
    });

    const totalSpent = await Payment.aggregate([
      { $match: { userId: userId, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const paymentHistory = await Payment.find({ userId })
      .populate('profileId', 'fullName profilePhoto category')
      .sort({ createdAt: -1 })
      .limit(20);

    const fixedHistory = paymentHistory.map(p => {
      const pObj = p.toObject();
      if (pObj.profileId) {
        pObj.profileId.profilePhoto = fixPhotoUrl(pObj.profileId.profilePhoto);
      }
      return pObj;
    });

    res.json({
      success: true,
      unlockedProfiles: fixedUnlocked,
      totalSpent: totalSpent[0]?.total || 0,
      count: fixedUnlocked.length,
      paymentHistory: fixedHistory
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const requestWithdrawal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, mpesaNumber } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if ((user.totalUnlocks || 0) < 6) {
    return res.status(403).json({
      message: `Unlock 6 profiles to withdraw to M-Pesa. You have unlocked ${user.totalUnlocks || 0} profiles.`,
      unlocksRequired: 6,
      currentUnlocks: user.totalUnlocks || 0
    });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Invalid withdrawal amount' });
  }

  if (amount > user.walletBalance) {
    return res.status(400).json({ message: 'Insufficient wallet balance' });
  }

  if (!mpesaNumber && !user.mpesaNumber) {
    return res.status(400).json({ message: 'M-Pesa number is required' });
  }

    const withdrawalId = `WDR-${Date.now()}-${userId.toString().slice(-6)}`;

    user.walletBalance -= amount;
    await user.save();

    res.json({
      success: true,
      message: `Withdrawal of KES ${amount} initiated to ${mpesaNumber || user.mpesaNumber}`,
      withdrawal: {
        id: withdrawalId,
        amount,
        mpesaNumber: mpesaNumber || user.mpesaNumber,
        status: 'pending',
        createdAt: new Date()
      },
      newBalance: user.walletBalance
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

async function unlockProfileForUser(userId, profileId) {
  await UnlockedProfile.findOneAndUpdate(
    { userId, unlockedUserId: profileId },
    { isActive: true, expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
    { upsert: true, new: true }
  );

  const user = await User.findById(userId);
  if (user) {
    user.totalUnlocks = (user.totalUnlocks || 0) + 1;
    user.totalEarnings = (user.totalEarnings || 0) + 500;
    user.walletBalance = (user.walletBalance || 0) + 500;
    user.canWithdraw = user.totalUnlocks >= 6;
    await user.save();
  }
  return user;
}

const submitManualPayment = async (req, res) => {
  try {
    const { profileId, confirmationCode, phoneNumber } = req.body;
    const userId = req.user.id;

    if (!profileId || !confirmationCode) {
      return res.status(400).json({ message: 'Profile ID and confirmation code are required' });
    }

    const profile = await User.findById(profileId);
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const transactionId = `MANUAL-${Date.now()}-${userId.toString().slice(-6)}`;
    const payment = await Payment.create({
      userId,
      profileId,
      amount: 99,
      currency: 'KES',
      paymentMethod: 'manual',
      transactionId,
      status: 'completed',
      completedAt: new Date(),
      metadata: { confirmationCode, phoneNumber }
    });

    await unlockProfileForUser(userId, profileId);

    res.status(201).json({
      success: true,
      message: 'Payment confirmed. Profile unlocked!',
      payment: {
        id: payment._id,
        transactionId,
        amount: 99,
        status: 'completed'
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

async function initiateSTKPush({ phoneNumber, amount, accountReference, transactionDesc, checkoutRequestId }) {
  try {
    const password = Buffer.from(
      process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + new Date().toISOString().slice(0, 10).replace(/-/g, '')
    ).toString('base64');

    const response = await axios.post(
      process.env.MPESA_ENV === 'live'
        ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
        : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '').replace(/\.\d{3}/, ''),
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: phoneNumber,
        CallBackURL: `${process.env.BACKEND_URL}/api/payments/mpesa/callback`,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc
      },
      {
        headers: {
          'Authorization': `Bearer ${await getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('STK Push Error:', error);
    throw error;
  }
}

async function getAccessToken() {
  try {
    const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
    const response = await axios.get(
      process.env.MPESA_ENV === 'live'
        ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
        : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error('Token Error:', error);
    throw error;
  }
}

const smartPayWebhook = async (req, res) => {
  try {
    const data = req.body || {};
    console.log('SmartPay webhook received:', data);

    const checkoutRequestId = data.checkout_request_id || data.CheckoutRequestID || data.merchant_request_id;
    const resultCode = data.ResultCode || data.result_code || data.resultCode;
    const transactionStatus = data.TransactionStatus || data.transaction_status || data.status;

    if (!checkoutRequestId) {
      return res.status(400).json({ message: 'Missing checkout_request_id' });
    }

    const payment = await Payment.findOne({ checkoutRequestId });
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.status === 'completed') {
      return res.status(200).json({ success: true, message: 'Already completed' });
    }

    if (resultCode == 0 || transactionStatus === 'Completed' || transactionStatus === 'completed') {
      payment.status = 'completed';
      payment.completedAt = new Date();
      payment.metadata = { ...payment.metadata, webhook: data };
      await payment.save();

      await handleSuccessfulPayment(payment._id.toString());
      return res.status(200).json({ success: true, message: 'Payment completed' });
    }

    payment.status = 'failed';
    payment.metadata = { ...payment.metadata, webhook: data };
    await payment.save();

    res.status(200).json({ success: true, message: 'Payment failed' });
  } catch (error) {
    console.error('SmartPay webhook error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};

module.exports = {
  initiateMpesa,
  mpesaCallback,
  submitManualPayment,
  getPaymentStatus,
  getPaymentHistory,
  getWallet,
  requestWithdrawal,
  initiateSmartPayPayment,
  checkSmartPayStatus,
  smartPayWebhook
};
