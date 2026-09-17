const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY
  });
};

const VALID_CATEGORIES = ['white-female', 'white-male'];

const register = async (req, res) => {
  try {
    const { fullName, phoneNumber, category } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ message: 'Full name is required' });
    }

    if (!phoneNumber || !phoneNumber.trim()) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: 'Invalid category. Must be white-female or white-male' });
    }

    const cleanPhone = phoneNumber.replace(/\s/g, '');

    const userExists = await User.findOne({ phoneNumber: cleanPhone });
    if (userExists) {
      return res.status(400).json({ message: 'Phone number already registered' });
    }

    const user = await User.create({
      fullName: fullName.trim(),
      phoneNumber: cleanPhone,
      password: null,
      dateOfBirth: null,
      gender: category === 'white-male' ? 'male' : 'female',
      county: '',
      bio: '',
      profilePhoto: '/default-avatar.png',
      category,
      lookingFor: '',
      isDummy: false,
      isVerified: false,
      isActive: true,
      isActivated: false
    });

    if (user) {
      res.status(201).json({
        success: true,
        message: 'Registration successful!',
        user: {
          id: user._id,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          walletBalance: user.walletBalance,
          totalUnlocks: user.totalUnlocks,
          totalEarnings: user.totalEarnings,
          canWithdraw: user.canWithdraw,
          category: user.category,
          isActivated: user.isActivated
        },
        token: generateToken(user._id)
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(401).json({ message: 'Phone number not registered' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ message: 'Account has been suspended' });
    }

    user.lastSeen = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Login successful!',
      user: {
        id: user._id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        walletBalance: user.walletBalance,
        totalUnlocks: user.totalUnlocks,
        totalEarnings: user.totalEarnings,
        canWithdraw: user.canWithdraw,
        category: user.category,
        profilePhoto: user.profilePhoto,
        isActivated: user.isActivated
      },
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { fullName, phoneNumber, mpesaNumber } = req.body;

    if (fullName) user.fullName = fullName;
    if (mpesaNumber !== undefined) user.mpesaNumber = mpesaNumber;
    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      const existingUser = await User.findOne({ phoneNumber });
      if (existingUser) {
        return res.status(400).json({ message: 'Phone number already in use' });
      }
      user.phoneNumber = phoneNumber;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        mpesaNumber: user.mpesaNumber,
        walletBalance: user.walletBalance,
        totalUnlocks: user.totalUnlocks,
        totalEarnings: user.totalEarnings,
        canWithdraw: user.canWithdraw,
        profilePhoto: user.profilePhoto
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndDelete(req.user.id);
    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateMe,
  deleteMe
};
