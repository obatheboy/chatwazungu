const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const WOMAN_PROMPT = 'professional studio headshot of a beautiful young white caucasian woman, friendly smile, soft natural lighting, plain light background, photorealistic, high quality, sharp focus';
const MAN_PROMPT = 'professional studio headshot of a handsome young white caucasian man, confident smile, soft natural lighting, plain light background, photorealistic, high quality, sharp focus';

const IMAGES_DIR = path.join(__dirname, '../public/cache/images');
fs.mkdirSync(IMAGES_DIR, { recursive: true });
const HD_MIN_BYTES = 30000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPollinations(prompt, seed) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=1000&seed=${seed}&nologo=true&model=flux`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error('status ' + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < HD_MIN_BYTES) throw new Error('image too small');
  return buf;
}

async function getProcessedImage(file) {
  const processedPath = path.join(IMAGES_DIR, file.replace('.jpg', '_hd.jpg'));
  if (fs.existsSync(processedPath) && fs.statSync(processedPath).size > HD_MIN_BYTES) {
    return processedPath;
  }

  const sourcePath = path.join(IMAGES_DIR, file);
  if (!fs.existsSync(sourcePath) || fs.statSync(sourcePath).size <= HD_MIN_BYTES) {
    return null;
  }

  await sharp(sourcePath)
    .resize(800, 1000, { fit: 'cover', position: 'top' })
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(processedPath);

  return processedPath;
}

const generateImage = async (req, res) => {
  try {
    const file = req.params.file;
    const m = /^(woman|man)_(\d+)\.jpg$/.exec(file || '');
    if (!m) return res.status(400).json({ message: 'Invalid image name' });

    const gender = m[1];
    const index = parseInt(m[2], 10);
    const localPath = path.join(IMAGES_DIR, file);

    if (!fs.existsSync(localPath) || fs.statSync(localPath).size <= HD_MIN_BYTES) {
      try {
        const buf = await fetchPollinations(gender === 'man' ? MAN_PROMPT : WOMAN_PROMPT, index);
        fs.writeFileSync(localPath, buf);
      } catch (e) {
        return res.status(404).json({ message: 'Image not found' });
      }
    }

    const processedPath = await getProcessedImage(file);
    if (processedPath) {
      res.setHeader('Cache-Control', 'public, max-age=2592000');
      return res.sendFile(processedPath);
    }

    res.setHeader('Cache-Control', 'public, max-age=2592000');
    return res.sendFile(localPath);
  } catch (error) {
    console.error('generateImage error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { generateImage };
