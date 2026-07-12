require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const WOMEN_PHOTO_COUNT = 35;
const MEN_PHOTO_COUNT = 35;
const femalePhotos = Array.from({ length: WOMEN_PHOTO_COUNT }, (_, i) => `https://i.pravatar.cc/1000?img=${i + 1}`);
const malePhotos = Array.from({ length: MEN_PHOTO_COUNT }, (_, i) => `https://i.pravatar.cc/1000?img=${36 + i}`);

const women = [
  'Emma Smith', 'Olivia Johnson', 'Ava Williams', 'Sophia Brown', 'Isabella Jones',
  'Mia Davis', 'Charlotte Wilson', 'Amelia Taylor', 'Harper Anderson', 'Evelyn Thomas',
  'Abigail Martinez', 'Emily Garcia', 'Elizabeth Lee', 'Ella White', 'Grace Harris',
  'Victoria Clark', 'Chloe Lewis', 'Zoey Robinson', 'Lily Walker', 'Hannah Young'
];

const men = [
  'James Smith', 'John Wilson', 'Robert Johnson', 'Michael Brown', 'William Davis',
  'David Martinez', 'Richard Garcia', 'Joseph Lee', 'Thomas White', 'Charles Harris',
  'Robin Smith', 'Liam Johnson', 'Noah Williams', 'Oliver Brown', 'Elijah Jones',
  'Lucas Davis', 'Mason Wilson', 'Logan Taylor', 'Alexander Martin', 'Ethan Harris'
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    let createdCount = 0;

    for (let i = 0; i < 20; i++) {
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - (25 + Math.floor(Math.random() * 15)));
      dateOfBirth.setHours(0, 0, 0, 0);

      await User.create({
        fullName: women[i],
        phoneNumber: `dummy${Date.now()}${createdCount}@chatwazungu.com`,
        password: await bcrypt.hash('dummy123', 10),
        dateOfBirth,
        gender: 'female',
        county: 'Nairobi',
        bio: `Hi, I'm ${women[i]}. Looking to meet new people.`,
        profilePhoto: femalePhotos[i % femalePhotos.length],
        category: 'white-female',
        lookingFor: 'male',
        isDummy: true,
        isVerified: true,
        isActive: true,
        onlineStatus: Math.random() > 0.3 ? 'online' : 'offline',
        tags: ['New']
      });
      createdCount++;
      process.stdout.write(`\r${createdCount}/40 profiles created...`);
    }

    for (let i = 0; i < 20; i++) {
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - (25 + Math.floor(Math.random() * 15)));
      dateOfBirth.setHours(0, 0, 0, 0);

      await User.create({
        fullName: men[i],
        phoneNumber: `dummy${Date.now()}${createdCount}@chatwazungu.com`,
        password: await bcrypt.hash('dummy123', 10),
        dateOfBirth,
        gender: 'male',
        county: 'Nairobi',
        bio: `Hi, I'm ${men[i]}. Looking to meet new people.`,
        profilePhoto: malePhotos[i % malePhotos.length],
        category: 'white-male',
        lookingFor: 'female',
        isDummy: true,
        isVerified: true,
        isActive: true,
        onlineStatus: Math.random() > 0.3 ? 'online' : 'offline',
        tags: ['New']
      });
      createdCount++;
      process.stdout.write(`\r${createdCount}/40 profiles created...`);
    }

    console.log(`\n\n✅ Done! Created ${createdCount} profiles (20 women, 20 men)`);
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seed();
