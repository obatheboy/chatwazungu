const fs = require('fs');
const path = require('path');

const WOMAN_PROMPT = 'professional studio headshot of a beautiful young white caucasian woman, friendly smile, soft natural lighting, plain light background, photorealistic, high quality, highly detailed, sharp focus, 4k';
const MAN_PROMPT = 'professional studio headshot of a handsome young white caucasian man, confident smile, soft natural lighting, plain light background, photorealistic, high quality, highly detailed, sharp focus, 4k';

const IMAGES_DIR = path.join(__dirname, '../public/cache/images');
fs.mkdirSync(IMAGES_DIR, { recursive: true });

const HD_WIDTH = 1280;
const HD_HEIGHT = 1600;
const HD_MIN_BYTES = 30000;
const PRAVATAR_SIZE = 1000;
const upgrading = new Set();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPollinations(prompt, seed) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${HD_WIDTH}&height=${HD_HEIGHT}&seed=${seed}&nologo=true&model=flux&enhance=true`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error('status ' + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < HD_MIN_BYTES) throw new Error('image too small');
  return buf;
}

// Reliable HD fallback. Randomuser portraits are only ~128px and look blurry
// when stretched into the large cards, so we use pravatar at 1000px instead.
async function fetchFallback(gender, index) {
  const imgNum = (index % 70) + 1;
  const res = await fetch(`https://i.pravatar.cc/${PRAVATAR_SIZE}?img=${imgNum}`, { redirect: 'follow' });
  if (!res.ok) throw new Error('status ' + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 5000) throw new Error('fallback too small');
  return buf;
}

function triggerUpgrade(gender, index, localPath) {
  const key = path.basename(localPath);
  if (upgrading.has(key)) return;
  upgrading.add(key);
  (async () => {
    const prompt = gender === 'man' ? MAN_PROMPT : WOMAN_PROMPT;
    for (let attempt = 1; attempt <= 8; attempt++) {
      try {
        const buf = await fetchPollinations(prompt, index);
        fs.writeFileSync(localPath, buf);
        upgrading.delete(key);
        return;
      } catch (e) {
        await sleep(Math.min(60000, 5000 * attempt));
      }
    }
    upgrading.delete(key);
  })();
}

const generateImage = async (req, res) => {
  try {
    const file = req.params.file;
    const m = /^(woman|man)_(\d+)\.jpg$/.exec(file || '');
    if (!m) return res.status(400).json({ message: 'Invalid image name' });

    const gender = m[1];
    const index = parseInt(m[2], 10);
    const localPath = path.join(IMAGES_DIR, file);
    const fallbackPath = localPath.replace(/\.jpg$/, '.fallback.jpg');

    // Already have an HD generated image — serve it.
    if (fs.existsSync(localPath) && fs.statSync(localPath).size > HD_MIN_BYTES) {
      return res.sendFile(localPath);
    }

    // Try to render a fresh HD AI image (also upgrades any old low-res cache).
    try {
      const buf = await fetchPollinations(promptFor(gender), index);
      fs.writeFileSync(localPath, buf);
      return res.sendFile(localPath);
    } catch (e) {
      // Pollinations rate-limited/unavailable — serve a reliable HD fallback
      // while a background job keeps trying to upgrade to the themed AI face.
      if (!fs.existsSync(fallbackPath)) {
        try {
          const fb = await fetchFallback(gender, index);
          fs.writeFileSync(fallbackPath, fb);
        } catch (_) {
          // ignore — a cached low-res file (if any) will be served below
        }
      }

      if (fs.existsSync(fallbackPath)) {
        res.sendFile(fallbackPath);
      } else if (fs.existsSync(localPath)) {
        res.sendFile(localPath);
      } else {
        return res.status(404).json({ message: 'Image not found' });
      }

      triggerUpgrade(gender, index, localPath);
    }
  } catch (error) {
    console.error('generateImage error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

function promptFor(gender) {
  return gender === 'man' ? MAN_PROMPT : WOMAN_PROMPT;
}

module.exports = { generateImage };
