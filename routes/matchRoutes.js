const express = require('express');
const router = express.Router();
const { getDiscover, swipe, getMatches, unmatch } = require('../controllers/matchController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/discover', getDiscover);
router.post('/like', swipe);
router.get('/', getMatches);
router.delete('/:matchId', unmatch);

module.exports = router;
