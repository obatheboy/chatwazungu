const https = require('https');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../public/cache/profiles');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

// pravatar.cc provides HD face avatars (up to 1000px). 70 distinct faces available.
const WOMEN_COUNT = 35;
const MEN_COUNT = 35;
const SIZE = 1000;

function download(url, filepath) {
  return new Promise((resolve, reject) => {
    https.get(url, { followRedirect: true }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        download(res.headers.location, filepath).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode === 200) {
        const file = fs.createWriteStream(filepath);
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      } else {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
    }).on('error', reject);
  });
}

async function main() {
  // Women: pravatar img 1..35
  for (let i = 0; i < WOMEN_COUNT; i++) {
    const img = i + 1;
    const url = `https://i.pravatar.cc/${SIZE}?img=${img}`;
    const filepath = path.join(dir, `woman_${i + 1}.jpg`);
    process.stdout.write(`Downloading woman_${i + 1}.jpg... `);
    try {
      await download(url, filepath);
      console.log(`OK ${(fs.statSync(filepath).size / 1024).toFixed(0)}KB`);
    } catch (err) {
      console.log(`FAILED ${err.message}`);
    }
  }

  // Men: pravatar img 36..70
  for (let i = 0; i < MEN_COUNT; i++) {
    const img = i + 36;
    const url = `https://i.pravatar.cc/${SIZE}?img=${img}`;
    const filepath = path.join(dir, `man_${i + 1}.jpg`);
    process.stdout.write(`Downloading man_${i + 1}.jpg... `);
    try {
      await download(url, filepath);
      console.log(`OK ${(fs.statSync(filepath).size / 1024).toFixed(0)}KB`);
    } catch (err) {
      console.log(`FAILED ${err.message}`);
    }
  }

  console.log('\nDone!');
}

main().catch(err => { console.error(err); process.exit(1); });
