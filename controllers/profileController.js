const User = require('../models/User');
const UnlockedProfile = require('../models/UnlockedProfile');

const getProfiles = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    let query = {
      isDummy: true,
      isActive: true,
      isSuspended: false,
      _id: { $ne: user._id }
    };

    if (req.query.category && req.query.category !== 'all') {
      query.category = req.query.category;
    }

    if (req.query.gender === 'online') {
      query.onlineStatus = 'online';
    }

    const profiles = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(60);

    const unlockedProfileIds = await UnlockedProfile.find({
      userId: user._id,
      isActive: true
    }).select('unlockedUserId');
    const unlockedIds = unlockedProfileIds.map(u => u.unlockedUserId.toString());

    const profilesWithStatus = profiles.map(profile => {
      const profileObj = profile.toObject();
      profileObj.isUnlocked = unlockedIds.includes(profile._id.toString());
      return profileObj;
    });

    res.json({
      success: true,
      profiles: profilesWithStatus,
      count: profilesWithStatus.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const searchProfiles = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { q, category } = req.query;

    let query = {
      isDummy: true,
      isActive: true,
      isSuspended: false,
      _id: { $ne: user._id }
    };

    if (q) {
      query.$or = [
        { fullName: { $regex: q, $options: 'i' } }
      ];
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    const profiles = await User.find(query)
      .select('-password')
      .limit(30);

    const unlockedProfileIds = await UnlockedProfile.find({
      userId: user._id,
      isActive: true
    }).select('unlockedUserId');
    const unlockedIds = unlockedProfileIds.map(u => u.unlockedUserId.toString());

    const profilesWithStatus = profiles.map(profile => {
      const profileObj = profile.toObject();
      profileObj.isUnlocked = unlockedIds.includes(profile._id.toString());
      return profileObj;
    });

    res.json({
      success: true,
      profiles: profilesWithStatus,
      count: profilesWithStatus.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getProfile = async (req, res) => {
  try {
    const profileId = req.params.id;
    const userId = req.user.id;

    const profile = await User.findById(profileId).select('-password');
    
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const unlocked = await UnlockedProfile.findOne({
      userId,
      unlockedUserId: profileId,
      isActive: true
    });

    const profileData = profile.toObject();
    profileData.isUnlocked = !!unlocked;

    if (!profileData.isUnlocked) {
      profileData.bio = 'This profile is locked. Unlock to view full details and chat.';
      delete profileData.phoneNumber;
    }

    res.json({
      success: true,
      profile: profileData,
      isUnlocked: !!unlocked
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getCounties = async (req, res) => {
  const counties = [
    'Mombasa', 'Kwale', 'Kilifi', 'Tana River', 'Lamu', 'Taita Taveta',
    'Garissa', 'Wajir', 'Mandera', 'Marsabit', 'Isiolo', 'Meru', 'Tharaka-Nithi',
    'Embu', 'Kitui', 'Machakos', 'Makueni', 'Nyandarua', 'Nyeri', 'Kirinyaga',
    'Murang\'a', 'Kiambu', 'Turkana', 'West Pokot', 'Samburu', 'Trans-Nzoia',
    'Uasin Gishu', 'Elgeyo-Marakwet', 'Nandi', 'Baringo', 'Laikipia', 'Nakuru',
    'Narok', 'Kajiado', 'Kericho', 'Bomet', 'Kakamega', 'Vihiga', 'Bungoma',
    'Busia', 'Siaya', 'Kisumu', 'Homa Bay', 'Migori', 'Kisii', 'Nyamira',
    'Nairobi'
  ];

  res.json({
    success: true,
    counties
  });
};

const getFeaturedProfiles = async (req, res) => {
  try {
    const profiles = await User.find({
      isDummy: true,
      isActive: true,
      isSuspended: false
    })
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(12);

    const unlockedProfileIds = await UnlockedProfile.find({
      userId: req.user.id,
      isActive: true
    }).select('unlockedUserId');
    const unlockedIds = unlockedProfileIds.map(u => u.unlockedUserId.toString());

    const profilesWithStatus = profiles.map(profile => {
      const profileObj = profile.toObject();
      profileObj.isUnlocked = unlockedIds.includes(profile._id.toString());
      return profileObj;
    });

    res.json({
      success: true,
      profiles: profilesWithStatus
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getProfiles,
  getProfile,
  getCounties,
  searchProfiles,
  getFeaturedProfiles
};
