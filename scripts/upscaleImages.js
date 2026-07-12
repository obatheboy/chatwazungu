const https = require('https');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const imageDir = path.join(__dirname, '../public/cache/profiles');
if (!fs.existsSync(imageDir)) {
  fs.mkdirSync(imageDir, { recursive: true });
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

async function processImages() {
  console.log('📥 Downloading and upscaling images...');
  
  const women = Array.from({ length: 20 }, (_, i) => ({
    id: (i * 3) + 25,
    filename: `woman_${i + 1}.jpg`
  }));
  
  const men = Array.from({ length: 20 }, (_, i) => ({
    id: (i * 3) + 25,
    filename: `man_${i + 1}.jpg`
  }));

  for (const w of women) {
    const url = `https://randomuser.me/api/portraits/women/${w.id}.jpg`;
    const filepath = path.join(imageDir, w.filename);
    
    console.log(`Downloading woman ${w.id}...`);
    const buffer = await downloadImage(url);
    await sharp(buffer)
      .resize(1920, 1920, { fit: 'cover', withoutEnlargement: false })
      .jpeg({ quality: 90 })
      .toFile(filepath);
    console.log(`✅ Saved ${w.filename}`);
  }

  for (const m of men) {
    const url = `https://randomuser.me/api/portraits/men/${m.id}.jpg`;
    const filepath = path.join(imageDir, m.filename);
    
    console.log(`Downloading man ${m.id}...`);
    const buffer = await downloadImage(url);
    await sharp(buffer)
      .resize(1920, 1920, { fit: 'cover', withoutEnlargement: false })
      .jpeg({ quality: 90 })
      .toFile(filepath);
    console.log(`✅ Saved ${m.filename}`);
  }

  console.log('\n🎉 All images processed!');
}

processImages().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
