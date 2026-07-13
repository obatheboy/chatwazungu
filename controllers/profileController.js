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
    const user = await User.findById(req.user.id).lean();
    
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
      .limit(60)
      .lean();

    const profileIds = profiles.map(p => p._id);
    const unlockedDocs = await UnlockedProfile.find({
      userId: user._id,
      unlockedUserId: { $in: profileIds },
      isActive: true
    }).select('unlockedUserId');
    const unlockedIds = new Set(unlockedDocs.map(u => u.unlockedUserId.toString()));

    const profilesWithStatus = profiles.map(profile => {
      const profileObj = { ...profile };
      profileObj.isUnlocked = unlockedIds.has(profileObj._id.toString());
      profileObj.profilePhoto = fixPhotoUrl(profileObj.profilePhoto);
      return profileObj;
    });

    const males = profilesWithStatus.filter(p => p.gender === 'male');
    const females = profilesWithStatus.filter(p => p.gender !== 'male');
    const sorted = [];
    const max = Math.max(males.length, females.length);
    for (let i = 0; i < max; i++) {
      if (i < males.length) sorted.push(males[i]);
      if (i < females.length) sorted.push(females[i]);
    }

    res.json({
      success: true,
      profiles: sorted,
      count: sorted.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const searchProfiles = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
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
      .limit(30)
      .lean();

    const profileIds = profiles.map(p => p._id);
    const unlockedDocs = await UnlockedProfile.find({
      userId: user._id,
      unlockedUserId: { $in: profileIds },
      isActive: true
    }).select('unlockedUserId');
    const unlockedIds = new Set(unlockedDocs.map(u => u.unlockedUserId.toString()));

    const profilesWithStatus = profiles.map(profile => {
      const profileObj = { ...profile };
      profileObj.isUnlocked = unlockedIds.has(profileObj._id.toString());
      profileObj.profilePhoto = fixPhotoUrl(profileObj.profilePhoto);
      return profileObj;
    });

    const males = profilesWithStatus.filter(p => p.gender === 'male');
    const females = profilesWithStatus.filter(p => p.gender !== 'male');
    const sorted = [];
    const max = Math.max(males.length, females.length);
    for (let i = 0; i < max; i++) {
      if (i < males.length) sorted.push(males[i]);
      if (i < females.length) sorted.push(females[i]);
    }

    res.json({
      success: true,
      profiles: sorted,
      count: sorted.length
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

    const profile = await User.findById(profileId).select('-password').lean();
    
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const unlocked = await UnlockedProfile.findOne({
      userId,
      unlockedUserId: profileId,
      isActive: true
    });

    const profileData = { ...profile };
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
      .limit(12)
      .lean();

    const profileIds = profiles.map(p => p._id);
    const unlockedDocs = await UnlockedProfile.find({
      userId: req.user.id,
      unlockedUserId: { $in: profileIds },
      isActive: true
    }).select('unlockedUserId');
    const unlockedIds = new Set(unlockedDocs.map(u => u.unlockedUserId.toString()));

    const profilesWithStatus = profiles.map(profile => {
      const profileObj = { ...profile };
      profileObj.isUnlocked = unlockedIds.has(profileObj._id.toString());
      profileObj.profilePhoto = fixPhotoUrl(profileObj.profilePhoto);
      return profileObj;
    });

    const males = profilesWithStatus.filter(p => p.gender === 'male');
    const females = profilesWithStatus.filter(p => p.gender !== 'male');
    const sorted = [];
    const max = Math.max(males.length, females.length);
    for (let i = 0; i < max; i++) {
      if (i < males.length) sorted.push(males[i]);
      if (i < females.length) sorted.push(females[i]);
    }

    res.json({
      success: true,
      profiles: sorted
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
