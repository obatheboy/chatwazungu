const express = require('express');
const router = express.Router();
const { getProfiles, getProfile, getCounties, searchProfiles, getFeaturedProfiles } = require('../controllers/profileController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getProfiles);
router.get('/search', protect, searchProfiles);
router.get('/featured', protect, getFeaturedProfiles);
router.get('/:id', protect, getProfile);
router.get('/counties/all', getCounties);

module.exports = router;
