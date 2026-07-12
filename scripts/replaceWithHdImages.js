require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

// High-resolution remote avatar images (1000px). No local files / rewrites needed.
const PRAVATAR_SIZE = 1000;
const WOMEN_PHOTO_COUNT = 35; // pravatar img 1..35
const MEN_PHOTO_COUNT = 35;   // pravatar img 36..70

const femalePhoto = (n) => `https://i.pravatar.cc/${PRAVATAR_SIZE}?img=${(n % WOMEN_PHOTO_COUNT) + 1}`;
const malePhoto = (n) => `https://i.pravatar.cc/${PRAVATAR_SIZE}?img=${36 + (n % MEN_PHOTO_COUNT)}`;

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const profiles = await User.find({ isDummy: true });
  console.log(`Found ${profiles.length} dummy profiles`);

  let updated = 0;
  for (let i = 0; i < profiles.length; i++) {
    const p = profiles[i];
    const photo = p.gender === 'male' ? malePhoto(i) : femalePhoto(i);
    if (p.profilePhoto !== photo) {
      p.profilePhoto = photo;
      await p.save();
      updated++;
    }
  }

  console.log(`✅ Updated ${updated} profiles to HD images`);
  await mongoose.disconnect();
}

run().catch((err) => { console.error(err); process.exit(1); });
