const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const prompts = [
  'professional portrait of a young caucasian woman, curly blonde hair, wearing a red silk blouse, studio lighting, plain white background, photorealistic, sharp focus, 8k',
  'professional portrait of a young caucasian man, short brown hair, wearing a navy blue suit jacket, studio lighting, plain gray background, photorealistic, sharp focus, 8k',
  'professional portrait of a young caucasian woman, long black hair, wearing a green sweater, outdoor cafe background, natural lighting, photorealistic, sharp focus, 8k',
  'professional portrait of a young caucasian man, beard, wearing a white t-shirt and leather jacket, urban street background, golden hour lighting, photorealistic, sharp focus, 8k',
  'professional portrait of a young caucasian woman, ponytail, wearing a yellow summer dress, park background, sunny day, photorealistic, sharp focus, 8k',
  'professional portrait of a young caucasian man, glasses, wearing a gray hoodie, library background, soft window light, photorealistic, sharp focus, 8k',
  'professional portrait of a young caucasian woman, wavy auburn hair, wearing a purple blazer, office background, professional lighting, photorealistic, sharp focus, 8k',
  'professional portrait of a young caucasian man, athletic build, wearing a black polo shirt, gym background, bright lighting, photorealistic, sharp focus, 8k',
  'professional portrait of a young caucasian woman, short pixie cut, wearing a denim jacket, vintage shop background, warm lighting, photorealistic, sharp focus, 8k',
  'professional portrait of a young caucasian man, curly hair, wearing a striped sweater, bookstore background, cozy lighting, photorealistic, sharp focus, 8k',
  'professional portrait of a young caucasian woman, long straight hair, wearing an orange top, beach background, sunset lighting, photorealistic, sharp focus, 8k',
  'professional portrait of a young caucasian man, clean shaven, wearing a brown leather jacket, motorcycle background, dramatic lighting, photorealistic, sharp focus, 8k',
  'professional portrait of a young caucasian woman, braided hair, wearing a floral dress, garden background, morning light, photorealistic, sharp focus, 8k',
  'professional portrait of a young caucasian man, buzz cut, wearing a white button-down shirt, rooftop background, city skyline, photorealistic, sharp focus, 8k',
  'professional portrait of a young caucasian woman, highlighted hair, wearing a black turtleneck, art gallery background, spot lighting, photorealistic, sharp focus, 8k',
  'professional portrait of a young caucasian man, mustache, wearing a plaid shirt, coffee shop background, warm ambient light, photorealistic, sharp focus, 8k',
  'professional portrait of a young caucasian woman, afro hair, wearing a white linen shirt, terrace background, mediterranean vibe, photorealistic, sharp focus, 8k',
  'professional portrait of a young caucasian man, sunglasses, wearing a linen shirt, yacht background, ocean breeze, photorealistic, sharp focus, 8k',
  'professional portrait of a young caucasian woman, side-part hair, wearing a silver dress, cocktail bar background, dim ambient light, photorealistic, sharp focus, 8k',
  'professional portrait of a young caucasian man, undercut hairstyle, wearing a denim vest, music venue background, stage lighting, photorealistic, sharp focus, 8k',
];

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
    const promptIndex = index - 1;
    const prompt = prompts[promptIndex] || prompts[0];

    if (!fs.existsSync(localPath) || fs.statSync(localPath).size <= HD_MIN_BYTES) {
      try {
        const buf = await fetchPollinations(prompt, index + 42);
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
