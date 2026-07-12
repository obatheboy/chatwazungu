const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const WOMAN_PROMPT = 'professional studio headshot of a beautiful young white caucasian woman, friendly smile, soft natural lighting, plain light background, photorealistic, high quality, sharp focus';
const MAN_PROMPT = 'professional studio headshot of a handsome young white caucasian man, confident smile, soft natural lighting, plain light background, photorealistic, high quality, sharp focus';

const IMAGES_DIR = path.join(__dirname, '../public/cache/images');
fs.mkdirSync(IMAGES_DIR, { recursive: true });

const HD_WIDTH = 800;
const HD_HEIGHT = 1000;
const HD_MIN_BYTES = 30000;
const FALLBACK_WIDTH = 1000;
const FALLBACK_HEIGHT = 1250;
const upgrading = new Set();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPollinations(prompt, seed) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${HD_WIDTH}&height=${HD_HEIGHT}&seed=${seed}&nologo=true&model=flux`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error('status ' + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < HD_MIN_BYTES) throw new Error('image too small');
  return buf;
}

// Reliable, gender-matched HD fallback. Pollinations can be slow/rate-limited,
// so we serve a real portrait immediately and upgrade to the AI face later.
// randomuser portraits are tiny (~128px) so we upscale + sharpen to HD.
async function fetchFallback(gender, index) {
  const which = gender === 'man' ? 'men' : 'women';
  const res = await fetch(`https://randomuser.me/api/portraits/${which}/${index % 100}.jpg`);
  if (!res.ok) throw new Error('status ' + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  return sharp(buf)
    .resize(FALLBACK_WIDTH, FALLBACK_HEIGHT, { fit: 'cover', kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 1.0 })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
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

    // Already have the HD themed (white) AI face cached — serve it instantly.
    if (fs.existsSync(localPath) && fs.statSync(localPath).size > HD_MIN_BYTES) {
      res.setHeader('Cache-Control', 'public, max-age=2592000');
      return res.sendFile(localPath);
    }

    // Serve a reliable, gender-matched HD fallback immediately (no waiting on
    // the slow image generator), then upgrade to the themed face in background.
    if (!fs.existsSync(fallbackPath)) {
      try {
        const fb = await fetchFallback(gender, index);
        fs.writeFileSync(fallbackPath, fb);
      } catch (_) {
        // fall through — try pollinations synchronously as a last resort
      }
    }

    if (fs.existsSync(fallbackPath)) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.sendFile(fallbackPath);
      triggerUpgrade(gender, index, localPath);
      return;
    }

    // Last resort: generate the themed face now (may be slow on first hit).
    try {
      const buf = await fetchPollinations(promptFor(gender), index);
      fs.writeFileSync(localPath, buf);
      res.setHeader('Cache-Control', 'public, max-age=2592000');
      return res.sendFile(localPath);
    } catch (e) {
      return res.status(404).json({ message: 'Image not found' });
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
