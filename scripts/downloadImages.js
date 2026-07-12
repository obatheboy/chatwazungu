const https = require('https');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../public/cache/profiles');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const femaleIds = [25, 28, 31, 34, 37, 40, 43, 46, 49, 52, 55, 58, 61, 64, 67, 70, 73, 76, 79, 82];
const maleIds = [25, 28, 31, 34, 37, 40, 43, 46, 49, 52, 55, 58, 61, 64, 67, 70, 73, 76, 79, 82];

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
        reject(new Error(`HTTP ${res.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function main() {
  for (let i = 0; i < 20; i++) {
    const url = `https://randomuser.me/api/portraits/women/${femaleIds[i]}.jpg`;
    const filepath = path.join(dir, `woman_${i + 1}.jpg`);
    console.log(`Downloading woman_${i + 1}.jpg...`);
    await download(url, filepath);
    const stat = fs.statSync(filepath);
    console.log(`  OK ${stat.size} bytes`);
  }

  for (let i = 0; i < 20; i++) {
    const url = `https://randomuser.me/api/portraits/men/${maleIds[i]}.jpg`;
    const filepath = path.join(dir, `man_${i + 1}.jpg`);
    console.log(`Downloading man_${i + 1}.jpg...`);
    await download(url, filepath);
    const stat = fs.statSync(filepath);
    console.log(`  OK ${stat.size} bytes`);
  }

  console.log('\nDone!');
}

main().catch(err => { console.error(err); process.exit(1); });
