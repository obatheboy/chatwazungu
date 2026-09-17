const Chat = require('../models/Chat');
const UnlockedProfile = require('../models/UnlockedProfile');
const User = require('../models/User');
const axios = require('axios');

const fixPhotoUrl = (url) => {
  if (!url) return url;
  if (url.includes('/images/images/')) return url.replace(/\/images\/images\//g, '/images/');
  if (url.startsWith('/cache/profiles/')) {
    const file = url.replace('/cache/profiles/', '');
    return `/images/${file}`;
  }
  return url;
};

const getChats = async (req, res) => {
  try {
    const userId = req.user.id;

    const chats = await Chat.find({ userId, isActive: true })
      .populate('profileId', 'fullName profilePhoto category onlineStatus lastSeen')
      .sort({ updatedAt: -1 });

    const fixedChats = chats.map(chat => {
      const chatObj = chat.toObject();
      if (chatObj.profileId) {
        chatObj.profileId.profilePhoto = fixPhotoUrl(chatObj.profileId.profilePhoto);
      }
      return chatObj;
    });

    res.json({
      success: true,
      chats: fixedChats
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileId = req.params.profileId;

    if (userId.toString() === profileId.toString()) {
      return res.status(400).json({ message: 'Cannot chat with yourself' });
    }

    const unlocked = await UnlockedProfile.findOne({
      userId,
      unlockedUserId: profileId,
      isActive: true
    });

    if (!unlocked) {
      return res.status(403).json({ message: 'You need to unlock this profile to start chatting' });
    }

    const existingChat = await Chat.findOne({
      userId,
      profileId,
      isActive: true
    });

    if (existingChat) {
      return res.json({
        success: true,
        chat: existingChat
      });
    }

    const chat = await Chat.create({
      userId,
      profileId,
      messages: []
    });

    const populatedChat = await Chat.findById(chat._id)
      .populate('profileId', 'fullName profilePhoto category onlineStatus lastSeen');

    const chatObj = populatedChat.toObject();
    if (chatObj.profileId) {
      chatObj.profileId.profilePhoto = fixPhotoUrl(chatObj.profileId.profilePhoto);
    }

    res.status(201).json({
      success: true,
      chat: chatObj
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getChatMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileId = req.params.profileId;

    const chat = await Chat.findOne({ userId, profileId, isActive: true });
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    await Chat.updateOne(
      { _id: chat._id },
      { $set: { 'messages.$[elem].isRead': true } },
      { arrayFilters: [{ 'elem.sender': 'ai' }] }
    );

    res.json({
      success: true,
      messages: chat.messages
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileId = req.params.profileId;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const chat = await Chat.findOne({ userId, profileId, isActive: true });
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const userMessage = {
      sender: 'user',
      content: content.trim(),
      timestamp: new Date(),
      isRead: true
    };

    chat.messages.push(userMessage);

    const profile = await User.findById(profileId);
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const aiResponse = await generateAIResponse(profile, content, chat.messages);

    const aiMessage = {
      sender: 'ai',
      content: aiResponse,
      timestamp: new Date(),
      isRead: false
    };

    chat.messages.push(aiMessage);
    await chat.save();

    res.status(201).json({
      success: true,
      message: userMessage,
      aiResponse: aiMessage
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const checkUnlock = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileId = req.params.profileId;

    const unlocked = await UnlockedProfile.findOne({
      userId,
      unlockedUserId: profileId,
      isActive: true
    });

    res.json({
      success: true,
      isUnlocked: !!unlocked
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const userGreetings = [
  'Hey there! 😏',
  'Hi babe! 👋',
  'Hello there! 😘',
  'Hey sweet! 💋',
  'Hi honey! 😊',
  'Well hello there! 😙'
];

async function generateAIResponse(profile, userMessage, conversationHistory) {
  try {
    const age = profile.age || (profile.dateOfBirth ? computeAge(profile.dateOfBirth) : 'N/A');
    const firstName = profile.fullName?.split(' ')[0] || 'babe';

    const recentMsgs = conversationHistory.slice(-8).map(msg => msg.content).join('\n');

    const prompt = `You are ${profile.fullName}, a ${age} year old ${profile.category} from ${profile.county || 'Nairobi'}.
Personality: Warm, flirty, playful, confident, engaging. Like a real attractive adult person you might meet at a nice Nairobi lounge.
Bio: ${profile.bio || 'Looking for fun connections'}
Goal: Chat naturally and warmly with someone who has paid to chat with you. Be charming but appropriate.

Rules:
- Be warm, flirty but classy - like a real confident adult person
- Ask questions about the user, show genuine interest
- Keep responses short (1-2 sentences usually), natural and conversational
- Use emojis occasionally (not too many)
- Make them feel special and attractive
- Don\'t be vulgar or explicit
- If they say something playful, respond in kind with charm
- Reference their name if mentioned
- Stay in character as ${profile.fullName}

Previous conversation:
${recentMsgs}

User just said: "${userMessage}"

Respond as ${profile.fullName} in a warm, natural, slightly flirty way: Only return the response text, nothing else.`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: prompt
          }
        ],
        max_tokens: 100,
        temperature: 0.9
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    const aiText = response.data.choices[0]?.message?.content?.trim() || "Hey there! 😊 What's on your mind?";
    return aiText;
  } catch (error) {
    console.error('AI Error:', error);
    const greetings = [
      "Hey there! 😏 What's new with you?",
      "Hi babe! 😘 Tell me what's up",
      "Hey sweet! 💋 I was just thinking about you",
      "Hello there! 😊 You're fun to talk to"
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }
}

function computeAge(dateOfBirth) {
  if (!dateOfBirth) return 'N/A';
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age > 0 ? age : 'N/A';
}

module.exports = {
  getChats,
  createChat,
  getChatMessages,
  sendMessage,
  checkUnlock
};
