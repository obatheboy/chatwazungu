const https = require('https');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../public/cache/profiles');
fs.mkdirSync(dir, { recursive: true });

function fetchImage(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { followRedirect: true, timeout: 30000 }, (r) => {
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function download(srcUrl, name) {
  const file = path.join(dir, name);
  if (fs.existsSync(file) && fs.statSync(file).size > 2000) return false;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const buf = await fetchImage(srcUrl);
      if (buf.length < 2000) throw new Error('too small');
      fs.writeFileSync(file, buf);
      return true;
    } catch (e) {
      await sleep(1000 * attempt);
    }
  }
  throw new Error('failed: ' + name);
}

(async () => {
  for (let i = 0; i < 60; i++) {
    const ok = await download(`https://randomuser.me/api/portraits/women/${i}.jpg`, `woman_${i + 1}.jpg`);
    console.log(`woman_${i + 1} ${ok ? 'ok' : 'exists'}`);
  }
  for (let i = 0; i < 40; i++) {
    const ok = await download(`https://randomuser.me/api/portraits/men/${i}.jpg`, `man_${i + 1}.jpg`);
    console.log(`man_${i + 1} ${ok ? 'ok' : 'exists'}`);
  }
  console.log('DONE');
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
