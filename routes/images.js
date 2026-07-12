const express = require('express');
const router = express.Router();
const { generateImage } = require('../controllers/imageController');

// Serves HD generated profile images, generating + caching on first request.
// e.g. GET /images/woman_12.jpg  ->  HD white woman, seed 12
router.get('/:file', generateImage);

module.exports = router;
