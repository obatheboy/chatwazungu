const fs = require('fs');
const path = require('path');

const WOMAN_PROMPT = 'professional studio headshot of a beautiful young white caucasian woman, friendly smile, soft natural lighting, plain light background, photorealistic, high quality';
const MAN_PROMPT = 'professional studio headshot of a handsome young white caucasian man, confident smile, soft natural lighting, plain light background, photorealistic, high quality';

const IMAGES_DIR = path.join(__dirname, '../public/cache/images');
fs.mkdirSync(IMAGES_DIR, { recursive: true });

const HD_MIN_BYTES = 15000;
const upgrading = new Set();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPollinations(prompt, seed) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=1000&seed=${seed}&nologo=true&model=flux`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error('status ' + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < HD_MIN_BYTES) throw new Error('image too small');
  return buf;
}

async function fetchFallback(gender, index) {
  const which = gender === 'man' ? 'men' : 'women';
  const res = await fetch(`https://randomuser.me/api/portraits/${which}/${index % 100}.jpg`);
  return Buffer.from(await res.arrayBuffer());
}

function triggerUpgrade(gender, index, localPath) {
  const key = path.basename(localPath);
  if (upgrading.has(key)) return;
  upgrading.add(key);
  (async () => {
    const prompt = gender === 'man' ? MAN_PROMPT : WOMAN_PROMPT;
    for (let attempt = 1; attempt <= 6; attempt++) {
      try {
        const buf = await fetchPollinations(prompt, index);
        fs.writeFileSync(localPath, buf);
        upgrading.delete(key);
        return;
      } catch (e) {
        await sleep(Math.min(30000, 4000 * attempt));
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

    if (fs.existsSync(localPath) && fs.statSync(localPath).size > HD_MIN_BYTES) {
      return res.sendFile(localPath);
    }

    if (fs.existsSync(localPath)) {
      // Cached fallback (low-res) — serve now, upgrade to HD in background
      res.sendFile(localPath);
      triggerUpgrade(gender, index, localPath);
      return;
    }

    // No file yet — try HD, fall back to reliable image if rate-limited
    try {
      const buf = await fetchPollinations(promptFor(gender), index);
      fs.writeFileSync(localPath, buf);
      return res.sendFile(localPath);
    } catch (e) {
      const fb = await fetchFallback(gender, index);
      fs.writeFileSync(localPath, fb);
      res.sendFile(localPath);
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
