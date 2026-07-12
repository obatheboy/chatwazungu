const express = require('express');
const router = express.Router();
const {
  getChats,
  createChat,
  getChatMessages,
  sendMessage,
  checkUnlock
} = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getChats);
router.post('/:profileId', protect, createChat);
router.get('/:profileId/messages', protect, getChatMessages);
router.post('/:profileId/message', protect, sendMessage);
router.get('/:profileId/unlock', protect, checkUnlock);

module.exports = router;
