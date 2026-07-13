const User = require('../models/User');
const UnlockedProfile = require('../models/UnlockedProfile');

const fixPhotoUrl = (url) => {
  if (!url) return url;
  if (url.includes('/images/images/')) return url.replace(/\/images\/images\//g, '/images/');
  if (url.startsWith('/cache/profiles/')) {
    const file = url.replace('/cache/profiles/', '');
    return `https://chat-wazungu-e1ix.onrender.com/images/${file}`;
  }
  return url;
};

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
      profileObj.isUnlocked = unlockedIds.includes(profileObj._id.toString());
      profileObj.profilePhoto = fixPhotoUrl(profileObj.profilePhoto);
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
      profileObj.isUnlocked = unlockedIds.includes(profileObj._id.toString());
      profileObj.profilePhoto = fixPhotoUrl(profileObj.profilePhoto);
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
    profileData.profilePhoto = fixPhotoUrl(profileData.profilePhoto);

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
    'London', 'New York', 'Paris', 'Los Angeles', 'Dubai', 'Sydney',
    'Toronto', 'Berlin', 'Amsterdam', 'Milan', 'Madrid', 'Chicago',
    'Singapore', 'Hong Kong', 'Tokyo', 'Zurich', 'Geneva', 'Rome',
    'Barcelona', 'Vienna', 'Munich', 'Stockholm', 'Dublin', 'Brussels',
    'Copenhagen', 'Oslo', 'Hamburg', 'Frankfurt', 'Miami', 'Boston',
    'San Francisco', 'Seattle', 'Washington', 'Manchester', 'Lyon', 'Nice'
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
      profileObj.isUnlocked = unlockedIds.includes(profileObj._id.toString());
      profileObj.profilePhoto = fixPhotoUrl(profileObj.profilePhoto);
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
