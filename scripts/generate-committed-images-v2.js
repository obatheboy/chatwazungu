const fs = require('fs');
const path = require('path');
const https = require('https');

const IMAGES_DIR = path.join(__dirname, '../public/cache/images');
fs.mkdirSync(IMAGES_DIR, { recursive: true });

const HD_MIN_BYTES = 30000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const prompts = [
  // 1-20 alternating woman/man
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

const genders = [];
for (let i = 0; i < 20; i++) {
  genders.push(i % 2 === 0 ? 'woman' : 'man');
}

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
      } else {
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function generate(index) {
  const gender = genders[index];
  const prompt = prompts[index];
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=1000&seed=${index + 42}&nologo=true&model=flux`;
  const out = path.join(IMAGES_DIR, `${gender}_${index + 1}.jpg`);

  if (fs.existsSync(out) && fs.statSync(out).size > HD_MIN_BYTES) {
    console.log(`⏭️  ${gender}_${index + 1} already exists`);
    return;
  }

  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      await sleep(3000);
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) throw new Error('status ' + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < HD_MIN_BYTES) throw new Error('image too small');
      fs.writeFileSync(out, buf);
      console.log(`✅ ${gender}_${index + 1} (${buf.length} bytes)`);
      return;
    } catch (e) {
      process.stdout.write(`↻ ${gender}_${index + 1} retry ${attempt} (${e.message})\r`);
      await sleep(Math.min(60000, 4000 * attempt));
    }
  }
  console.log(`\n❌ FAILED ${gender}_${index + 1}`);
}

(async () => {
  console.log('🎨 Generating 20 diverse alternating portraits...');
  for (let i = 0; i < 20; i++) {
    await generate(i);
  }
  console.log('\n🎉 All diverse images generated.');
})();
