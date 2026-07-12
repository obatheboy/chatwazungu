require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const WOMEN_PHOTO_COUNT = 35;
const MEN_PHOTO_COUNT = 35;

const femalePhotos = Array.from({ length: WOMEN_PHOTO_COUNT }, (_, i) => `/cache/profiles/woman_${i + 1}.jpg`);
const malePhotos = Array.from({ length: MEN_PHOTO_COUNT }, (_, i) => `/cache/profiles/man_${i + 1}.jpg`);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const profiles = await User.find({ isDummy: true });
  console.log(`Found ${profiles.length} dummy profiles`);

  let updated = 0;
  for (const p of profiles) {
    const pool = p.gender === 'male' ? malePhotos : femalePhotos;
    // Distribute deterministically based on the document id so faces stay stable.
    const idx = parseInt(p._id.toString().slice(-6), 16) % pool.length;
    const photo = pool[idx];
    if (p.profilePhoto !== photo) {
      p.profilePhoto = photo;
      await p.save();
      updated++;
    }
  }

  console.log(`✅ Updated ${updated} profiles to HD images`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
