const Chat = require('../models/Chat');
const UnlockedProfile = require('../models/UnlockedProfile');
const User = require('../models/User');
const axios = require('axios');

const fixPhotoUrl = (url) => {
  if (!url) return url;
  if (url.includes('/images/images/')) return url.replace(/\/images\/images\//g, '/images/');
  if (url.startsWith('/cache/profiles/')) {
    const file = url.replace('/cache/profiles/', '');
    return `https://chat-wazungu-e1ix.onrender.com/images/${file}`;
  }
  return url;
};

// @desc    Get user chats
// @route   GET /api/chats
// @access  Private
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

// @desc    Create or get chat with a profile
// @route   POST /api/chats/:profileId
// @access  Private
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

// @desc    Get messages for a chat
// @route   GET /api/chats/:profileId
// @access  Private
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

// @desc    Send message and get AI response
// @route   POST /api/chats/:profileId/message
// @access  Private
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

// @desc    Check if profile is unlocked
// @route   GET /api/chats/:profileId/unlock
// @access  Private
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

// AI Response Generator
async function generateAIResponse(profile, userMessage, conversationHistory) {
  try {
    const prompt = `You are ${profile.fullName}, a ${profile.age} year old ${profile.category} from ${profile.county}. 
Personality: Flirty, attractive, engaging, warm.
Bio: ${profile.bio || 'Looking for fun connections'}
Goal: Chat naturally with someone who has paid to chat with you.

Rules:
- Be flirty but appropriate
- Ask questions about the user
- Use their name if they mentioned it
- Keep responses short (1-2 sentences usually)
- Use emojis occasionally
- Be engaging and make them feel special

User said: "${userMessage}"

Respond as ${profile.fullName}:`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: prompt
          },
          ...conversationHistory.slice(-10).map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content
          }))
        ],
        max_tokens: 150,
        temperature: 0.8
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    return response.data.choices[0]?.message?.content || "Hey there! 😊 How are you doing?";
  } catch (error) {
    console.error('AI Error:', error);
    return "Hey! I'm having a tiny technical issue but I'm still here for you 😘 What's on your mind?";
  }
}

module.exports = {
  getChats,
  createChat,
  getChatMessages,
  sendMessage,
  checkUnlock
};
