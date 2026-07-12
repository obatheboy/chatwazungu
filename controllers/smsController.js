const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @desc    Send OTP via SMS
// @route   POST /api/sms/send-otp
// @access  Public
const sendOTP = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    const otpToken = jwt.sign(
      { phoneNumber, otp },
      process.env.JWT_SECRET || 'chatwazungu-secret',
      { expiresIn: '10m' }
    );

    if (process.env.AFRICAS_TALKING_API_KEY && process.env.AFRICAS_TALKING_USERNAME) {
      try {
        const AfricasTalking = require('africastalking');
        const AT = AfricasTalking({
          apiKey: process.env.AFRICAS_TALKING_API_KEY,
          username: process.env.AFRICAS_TALKING_USERNAME
        });
        
        await AT.SMS.send({
          to: [phoneNumber],
          message: `Your ChatWazungu verification code is: ${otp}. Valid for 10 minutes.`
        });
      } catch (smsError) {
        console.error('SMS Error:', smsError);
      }
    }

    res.json({
      success: true,
      message: 'OTP sent successfully',
      otpToken,
      devOtp: process.env.NODE_ENV === 'development' ? otp : undefined
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Verify OTP
// @route   POST /api/sms/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
  try {
    const { otpToken, otp } = req.body;
    
    if (!otpToken || !otp) {
      return res.status(400).json({ message: 'OTP token and code are required' });
    }

    const decoded = jwt.verify(otpToken, process.env.JWT_SECRET || 'chatwazungu-secret');
    
    if (decoded.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP code' });
    }

    const user = await User.findOne({ phoneNumber: decoded.phoneNumber });
    if (user) {
      user.isPhoneVerified = true;
      await user.save();
    }

    res.json({
      success: true,
      message: 'Phone number verified successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Invalid or expired OTP token' });
  }
};

module.exports = {
  sendOTP,
  verifyOTP
};
