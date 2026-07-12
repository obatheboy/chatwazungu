const User = require('../models/User');
const Payment = require('../models/Payment');
const UnlockedProfile = require('../models/UnlockedProfile');
const crypto = require('crypto');

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

    res.json({
      success: true,
      payments
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

    const totalSpent = await Payment.aggregate([
      { $match: { userId: userId, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const paymentHistory = await Payment.find({ userId })
      .populate('profileId', 'fullName profilePhoto category')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      unlockedProfiles: unlocked,
      totalSpent: totalSpent[0]?.total || 0,
      count: unlocked.length,
      paymentHistory
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

    if (!user.canWithdraw) {
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

module.exports = {
  initiateMpesa,
  mpesaCallback,
  submitManualPayment,
  getPaymentStatus,
  getPaymentHistory,
  getWallet,
  requestWithdrawal
};
