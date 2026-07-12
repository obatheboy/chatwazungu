const https = require('https');
const fs = require('fs');
const path = require('path');

const WOMAN_PROMPT = 'professional studio headshot of a beautiful young white caucasian woman, friendly smile, soft natural lighting, plain light background, photorealistic';
const MAN_PROMPT = 'professional studio headshot of a handsome young white caucasian man, confident smile, soft natural lighting, plain light background, photorealistic';

const dir = path.join(__dirname, '../public/cache/profiles');
fs.mkdirSync(dir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fetchImage(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { followRedirect: true, timeout: 60000 }, (r) => {
      if (r.statusCode !== 200 || !/image/.test(r.headers['content-type'] || '')) {
        r.resume();
        return reject(new Error('bad status ' + r.statusCode));
      }
      const chunks = [];
      r.on('data', (c) => chunks.push(c));
      r.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function download(prompt, name, seed) {
  const file = path.join(dir, name);
  if (fs.existsSync(file) && fs.statSync(file).size > 5000) return false; // already have it
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=1000&seed=${seed}&nologo=true&model=flux`;
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      const buf = await fetchImage(url);
      if (buf.length < 5000) throw new Error('image too small');
      fs.writeFileSync(file, buf);
      return true;
    } catch (e) {
      await sleep(Math.min(30000, 5000 * attempt)); // back off up to 30s
    }
  }
  throw new Error('failed after retries: ' + name);
}

(async () => {
  for (let i = 1; i <= 60; i++) {
    const got = await download(WOMAN_PROMPT, `woman_${i}.jpg`, i);
    console.log(`woman_${i} ${got ? 'downloaded' : 'exists'}`);
    await sleep(7000);
  }
  for (let i = 1; i <= 40; i++) {
    const got = await download(MAN_PROMPT, `man_${i}.jpg`, i);
    console.log(`man_${i} ${got ? 'downloaded' : 'exists'}`);
    await sleep(7000);
  }
  console.log('DONE');
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
