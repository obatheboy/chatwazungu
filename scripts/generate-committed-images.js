const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '../public/cache/images');
fs.mkdirSync(IMAGES_DIR, { recursive: true });

const WOMAN_PROMPT = 'professional studio headshot of a beautiful young white caucasian woman, friendly smile, soft natural lighting, plain light background, photorealistic, high quality, sharp focus';
const MAN_PROMPT = 'professional studio headshot of a handsome young white caucasian man, confident smile, soft natural lighting, plain light background, photorealistic, high quality, sharp focus';

const HD_MIN_BYTES = 30000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generate(gender, i) {
  const prompt = gender === 'man' ? MAN_PROMPT : WOMAN_PROMPT;
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=1000&seed=${i}&nologo=true&model=flux`;
  const out = path.join(IMAGES_DIR, `${gender}_${i}.jpg`);

  if (fs.existsSync(out) && fs.statSync(out).size > HD_MIN_BYTES) {
    console.log(`⏭️  ${gender}_${i} already exists`);
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
      console.log(`✅ ${gender}_${i} (${buf.length} bytes)`);
      return;
    } catch (e) {
      process.stdout.write(`↻ ${gender}_${i} retry ${attempt} (${e.message})\r`);
      await sleep(Math.min(60000, 4000 * attempt));
    }
  }
  console.log(`\n❌ FAILED ${gender}_${i}`);
}

const CONCURRENCY = 1;

async function pool(items) {
  let i = 0;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (i < items.length) {
      const item = items[i++];
      await generate(item.gender, item.index);
    }
  });
  await Promise.all(workers);
}

(async () => {
  console.log('🎨 Generating 20 female + 20 male HD white portraits (concurrent)...');
  const items = [];
  for (let i = 1; i <= 20; i++) items.push({ gender: 'woman', index: i });
  for (let i = 1; i <= 20; i++) items.push({ gender: 'man', index: i });
  await pool(items);
  console.log('\n🎉 All committed images generated.');
})();
