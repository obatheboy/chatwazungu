const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const IMAGES_DIR = path.join(__dirname, '../public/cache/images');

async function fixImages() {
  const files = fs.readdirSync(IMAGES_DIR).filter(f => f.endsWith('.jpg'));
  console.log(`🔧 Fixing ${files.length} images to proper portrait dimensions...`);

  for (const file of files) {
    const inputPath = path.join(IMAGES_DIR, file);
    const tmpPath = inputPath + '.tmp';
    const meta = await sharp(inputPath).metadata();
    console.log(`${file}: ${meta.width}x${meta.height}`);

    await sharp(inputPath)
      .resize(800, 1000, { fit: 'cover', position: 'top' })
      .jpeg({ quality: 90, mozjpeg: true })
      .toFile(tmpPath);

    fs.renameSync(tmpPath, inputPath);

    const newMeta = await sharp(inputPath).metadata();
    console.log(`  → ${newMeta.width}x${newMeta.height}`);
  }

  console.log('\n🎉 All images fixed to 800x1000 portrait.');
}

fixImages().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
