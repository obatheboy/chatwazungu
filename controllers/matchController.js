const User = require('../models/User');
const Like = require('../models/Like');
const Match = require('../models/Match');
const Chat = require('../models/Chat');
const { fixPhotoUrl } = require('../utils/media');

const VALID_INTERESTS = [
  'music', 'travel', 'fitness', 'movies', 'gaming', 'food', 'art', 'sports',
  'reading', 'photography', 'dancing', 'hiking', 'tech', 'fashion', 'cars'
];

const VALID_LOOKING_FOR = [
  'Sugar Daddy', 'Sugar Mommy', 'Friendship', 'Dating', 'Casual', 'Serious',
  'Young Boy', 'Young Man', 'white-male', 'white-female'
];

const getDiscover = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentUser = req.user;

    const {
      interest,
      lookingFor,
      county,
      limit = 40
    } = req.query;

    // Users already liked or passed by current user
    const interactions = await Like.find({ fromUser: userId }).select('toUser');
    const excludedIds = [userId, ...interactions.map((i) => i.toUser)];

    const query = {
      _id: { $nin: excludedIds },
      isActive: true,
      isSuspended: false
    };

    // Prefer opposite gender if current has gender
    if (currentUser.gender && currentUser.gender !== 'other') {
      const opposite = currentUser.gender === 'male' ? 'female' : 'male';
      query.gender = opposite;
    }

    if (interest) {
      const interestsArr = Array.isArray(interest) ? interest : [interest];
      query.interests = { $in: interestsArr.map((i) => i.toString().trim()) };
    }

    if (lookingFor) {
      const lfArr = Array.isArray(lookingFor) ? lookingFor : [lookingFor];
      query.lookingFor = { $in: lfArr.map((i) => i.toString().trim()) };
    }

    if (county) {
      query.county = { $regex: new RegExp(`^${county}$`, 'i') };
    }

    const users = await User.find(query).limit(parseInt(limit, 10));

    const normalized = users.map((u) => {
      const obj = u.toObject ? u.toObject() : { ...u };

      // Age from DOB
      let age = null;
      if (obj.dateOfBirth) {
        const dob = new Date(obj.dateOfBirth);
        const now = new Date();
        age = now.getFullYear() - dob.getFullYear();
        const m = now.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
          age--;
        }
      }

      // Normalize lookingFor/interests to arrays
      let lf = obj.lookingFor;
      if (typeof lf === 'string') {
        lf = lf ? lf.split(',').map((x) => x.trim()).filter(Boolean) : [];
      }
      if (!Array.isArray(lf)) lf = [];

      let intr = obj.interests;
      if (!Array.isArray(intr)) intr = [];

      return {
        _id: obj._id,
        fullName: obj.fullName,
        phoneNumber: obj.phoneNumber,
        dateOfBirth: obj.dateOfBirth,
        age,
        gender: obj.gender,
        county: obj.county,
        bio: obj.bio,
        profilePhoto: fixPhotoUrl(obj.profilePhoto, req),
        category: obj.category || '',
        lookingFor: lf,
        interests: intr,
        whatsappNumber: obj.whatsappNumber || '',
        showWhatsapp: !!obj.showWhatsapp,
        isDummy: !!obj.isDummy,
        isVerified: !!obj.isVerified,
        onlineStatus: obj.onlineStatus,
        lastSeen: obj.lastSeen,
        isUnlocked: false
      };
    });

    // Sort: real users first, online first
    normalized.sort((a, b) => {
      if (a.isDummy !== b.isDummy) return a.isDummy ? 1 : -1;
      if (a.onlineStatus !== b.onlineStatus) {
        if (a.onlineStatus === 'online' && b.onlineStatus !== 'online') return -1;
        if (b.onlineStatus === 'online' && a.onlineStatus !== 'online') return 1;
      }
      return 0;
    });

    res.json({
      success: true,
      data: normalized
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const swipe = async (req, res) => {
  try {
    const fromUser = req.user.id;
    const { profileId, type } = req.body;

    if (!profileId) {
      return res.status(400).json({ message: 'profileId is required' });
    }

    // Validate ObjectId
    if (!profileId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid profileId' });
    }

    if (fromUser === profileId) {
      return res.status(400).json({ message: 'Cannot swipe on yourself' });
    }

    const toUser = await User.findById(profileId).select(
      'fullName gender profilePhoto dateOfBirth county bio category lookingFor interests whatsappNumber showWhatsapp isDummy isVerified onlineStatus lastSeen'
    );
    if (!toUser) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Upsert like
    await Like.findOneAndUpdate(
      { fromUser, toUser: profileId },
      { fromUser, toUser: profileId, type: type === 'pass' ? 'pass' : 'like' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (type === 'pass') {
      return res.json({ matched: false });
    }

    // Check reciprocal like
    const reciprocal = await Like.findOne({ fromUser: profileId, toUser: fromUser, type: 'like' });

    let matchId = null;
    let isNewMatch = false;

    if (reciprocal || toUser.isDummy) {
      // Auto-create reciprocal like for dummies if not exists
      if (toUser.isDummy && !reciprocal) {
        await Like.findOneAndUpdate(
          { fromUser: profileId, toUser: fromUser },
          { fromUser: profileId, toUser: fromUser, type: 'like' },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }

      // Find or reactivate match
      const existingMatch = await Match.findOne({
        users: { $all: [fromUser, profileId], $size: 2 }
      });

      if (existingMatch) {
        if (!existingMatch.isActive) {
          existingMatch.isActive = true;
          existingMatch.lastMessageAt = new Date();
          if (!existingMatch.matchedBy) existingMatch.matchedBy = fromUser;
          await existingMatch.save();
          isNewMatch = true;
        }
        matchId = existingMatch._id;
      } else {
        const newMatch = await Match.create({
          users: [fromUser, profileId],
          matchedBy: fromUser,
          isActive: true,
          lastMessageAt: new Date()
        });
        matchId = newMatch._id;
        isNewMatch = true;
      }

      // Create chat if missing
      let chat = await Chat.findOne({ userId: fromUser, profileId });
      if (!chat) {
        chat = await Chat.create({ userId: fromUser, profileId, messages: [] });
      }
      // Also ensure reverse chat exists if needed by existing logic
      let chat2 = await Chat.findOne({ userId: profileId, profileId: fromUser });
      if (!chat2 && toUser.isDummy) {
        // don't force, but not required
      }
    }

    const u = toUser.toObject ? toUser.toObject() : { ...toUser };
    let age = null;
    if (u.dateOfBirth) {
      const dob = new Date(u.dateOfBirth);
      const now = new Date();
      age = now.getFullYear() - dob.getFullYear();
      const m = now.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
    }
    let lf = u.lookingFor;
    if (typeof lf === 'string') {
      lf = lf ? lf.split(',').map((x) => x.trim()).filter(Boolean) : [];
    }
    if (!Array.isArray(lf)) lf = [];
    let intr = u.interests;
    if (!Array.isArray(intr)) intr = [];

    return res.json({
      matched: !!matchId,
      matchId: matchId || null,
      profile: {
        _id: u._id,
        fullName: u.fullName,
        gender: u.gender,
        profilePhoto: fixPhotoUrl(u.profilePhoto, req),
        dateOfBirth: u.dateOfBirth,
        age,
        county: u.county,
        bio: u.bio,
        category: u.category || '',
        lookingFor: lf,
        interests: intr,
        whatsappNumber: u.whatsappNumber || '',
        showWhatsapp: !!u.showWhatsapp,
        isDummy: !!u.isDummy,
        isVerified: !!u.isVerified,
        onlineStatus: u.onlineStatus,
        lastSeen: u.lastSeen
      },
      message: matchId ? 'It\'s a match!' : 'Like sent'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getMatches = async (req, res) => {
  try {
    const userId = req.user.id;

    const matches = await Match.find({ users: userId, isActive: true })
      .populate({
        path: 'users',
        select:
          '_id fullName phoneNumber profilePhoto dateOfBirth gender county bio category lookingFor interests whatsappNumber showWhatsapp isDummy isVerified onlineStatus lastSeen'
      })
      .sort({ lastMessageAt: -1, updatedAt: -1 });

    const result = matches.map((m) => {
      const other = m.users.find((u) => u._id.toString() !== userId.toString());
      if (!other) return null;

      const o = other.toObject ? other.toObject() : { ...other };
      let age = null;
      if (o.dateOfBirth) {
        const dob = new Date(o.dateOfBirth);
        const now = new Date();
        age = now.getFullYear() - dob.getFullYear();
        const m2 = now.getMonth() - dob.getMonth();
        if (m2 < 0 || (m2 === 0 && now.getDate() < dob.getDate())) age--;
      }
      let lf = o.lookingFor;
      if (typeof lf === 'string') {
        lf = lf ? lf.split(',').map((x) => x.trim()).filter(Boolean) : [];
      }
      if (!Array.isArray(lf)) lf = [];
      let intr = o.interests;
      if (!Array.isArray(intr)) intr = [];

      return {
        _id: m._id,
        lastMessageAt: m.lastMessageAt,
        isActive: m.isActive,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        user: {
          _id: o._id,
          fullName: o.fullName,
          phoneNumber: o.phoneNumber,
          profilePhoto: fixPhotoUrl(o.profilePhoto, req),
          dateOfBirth: o.dateOfBirth,
          age,
          gender: o.gender,
          county: o.county,
          bio: o.bio,
          category: o.category || '',
          lookingFor: lf,
          interests: intr,
          whatsappNumber: o.whatsappNumber || '',
          showWhatsapp: !!o.showWhatsapp,
          isDummy: !!o.isDummy,
          isVerified: !!o.isVerified,
          onlineStatus: o.onlineStatus,
          lastSeen: o.lastSeen,
          // unlock status - not tracked here; front-end may check separately
          isUnlocked: false
        }
      };
    }).filter(Boolean);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const unmatch = async (req, res) => {
  try {
    const userId = req.user.id;
    const { matchId } = req.params;

    if (!matchId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid matchId' });
    }

    const match = await Match.findOne({ _id: matchId, users: userId });
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    match.isActive = false;
    await match.save();

    res.json({
      success: true,
      message: 'Unmatched successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getDiscover,
  swipe,
  getMatches,
  unmatch
};
