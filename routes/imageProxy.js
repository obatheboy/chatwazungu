const express = require('express');
const router = express.Router();
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const imageCacheDir = path.join(__dirname, '../../cache/images');
if (!fs.existsSync(imageCacheDir)) {
  fs.mkdirSync(imageCacheDir, { recursive: true });
}

router.get('/proxy/:gender/:id', async (req, res) => {
  try {
    const { gender, id } = req.params;
    const validId = parseInt(id);
    
    if (!['women', 'men'].includes(gender) || isNaN(validId) || validId < 1 || validId > 99) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const sourceUrl = `https://randomuser.me/api/portraits/${gender}/${validId}.jpg`;
    const cachePath = path.join(imageCacheDir, `${gender}_${validId}.jpg`);

    if (!fs.existsSync(cachePath)) {
      const response = await axios.get(sourceUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(cachePath, response.data);
    }

    const stat = fs.statSync(cachePath);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=2592000');
    res.sendFile(cachePath);
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

module.exports = router;
