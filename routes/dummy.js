const express = require('express');
const router = express.Router();
const {
  generateDummyProfiles,
  getDummyProfiles
} = require('../controllers/dummyController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, adminOnly, getDummyProfiles);
router.post('/bulk', protect, adminOnly, generateDummyProfiles);

module.exports = router;
