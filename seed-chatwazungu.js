require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const categories = [
  { name: 'white-female', gender: 'female', count: 160 },
  { name: 'white-male', gender: 'male', count: 40 }
];

const femaleNames = [
  'Emma Johnson', 'Sophia Williams', 'Olivia Brown', 'Ava Jones', 'Isabella Garcia',
  'Mia Miller', 'Charlotte Davis', 'Amelia Rodriguez', 'Harper Martinez', 'Evelyn Anderson',
  'Abigail Wilson', 'Emily Taylor', 'Elizabeth Thomas', 'Ella Jackson', 'Grace White',
  'Victoria Harris', 'Chloe Martin', 'Zoey Thompson', 'Lily Garcia', 'Hannah Martinez',
  'Addison Robinson', 'Natalie Clark', 'Brooklyn Rodriguez', 'Zoe Lewis', 'Leah Lee',
  'Audrey Walker', 'Savannah Hall', 'Claire Allen', 'Aaliyah Young', 'Anna Hernandez',
  'Aria King', 'Ellie Wright', 'Scarlett Lopez', 'Maya Hill', 'Aubrey Scott',
  'Bella Green', 'Riley Adams', 'Aurora Baker', 'Layla Nelson', 'Penelope Carter',
  'Stella Mitchell', 'Nora Perez', 'Hazel Roberts', 'Zara Turner', 'Ivy Phillips',
  'Ruby Campbell', 'Sophie Parker', 'Alice Evans', 'Maya Edwards', 'Clara Collins'
];

const maleNames = [
  'James Wilson', 'John Smith', 'Robert Johnson', 'Michael Brown', 'William Jones',
  'David Garcia', 'Richard Miller', 'Joseph Davis', 'Thomas Rodriguez', 'Charles Martinez',
  'Christopher Anderson', 'Daniel Taylor', 'Matthew Thomas', 'Anthony Jackson', 'Mark White',
  'Donald Harris', 'Steven Martin', 'Paul Thompson', 'Andrew Garcia', 'Joshua Martinez',
  'Kenneth Robinson', 'Kevin Clark', 'Brian Rodriguez', 'George Lewis', 'Timothy Lee',
  'Ronald Walker', 'Edward Hall', 'Jason Allen', 'Jeffrey Young', 'Ryan Hernandez',
  'Jacob King', 'Gary Wright', 'Nicholas Lopez', 'Eric Hill', 'Jonathan Scott',
  'Stephen Green', 'Larry Adams', 'Justin Baker', 'Scott Nelson', 'Brandon Carter',
  'Benjamin Mitchell', 'Samuel Perez', 'Raymond Roberts', 'Gregory Turner', 'Frank Phillips',
  'Alexander Campbell', 'Patrick Parker', 'Jack Evans', 'Dennis Edwards', 'Jerry Collins'
];

const femaleBios = [
  'Stunning European beauty looking for exciting conversations',
  'Elegant and sophisticated woman seeking interesting people to chat with',
  'Blonde beauty with a passion for meaningful connections',
  'Classy woman with a warm heart and sharp mind',
  'Looking for someone special to share thoughts with',
  'Brunette goddess ready to brighten your day',
  'Intelligent and charming woman seeking stimulating conversations',
  'Elegant European woman with a contagious smile',
  'Beauty with brains, looking for genuine connections',
  'Sophisticated lady who loves deep conversations',
  'Charming and witty woman seeking interesting men',
  'Stunning blonde with a passion for life',
  'Elegant and cultured woman seeking meaningful chats',
  'Beautiful European woman with a kind heart',
  'Looking for someone to share laughter and stories with',
  'Graceful and intelligent woman seeking connection',
  'Radiant beauty with a warm personality',
  'Sophisticated woman with a playful side',
  'Elegant European lady seeking interesting conversations',
  'Charming woman with a zest for life',
  'Beautiful brunette with a contagious laugh',
  'Stunning woman with a heart of gold',
  'Elegant and refined woman seeking genuine connections',
  'Looking for someone to share adventures with',
  'Classy woman with a bright smile',
  'Sophisticated beauty seeking interesting people',
  'Warm and welcoming woman seeking connections',
  'Elegant European woman with great conversation',
  'Beautiful woman with a passionate soul',
  'Charming and elegant woman seeking chat partners'
];

const maleBios = [
  'Handsome European man seeking interesting conversations',
  'Confident and charming man looking to connect',
  'Fit and successful man seeking meaningful chats',
  'Sophisticated gentleman with a warm personality',
  'Looking for someone to share stories and laughter with',
  'Handsome man with a great sense of humor',
  'Elegant and cultured man seeking connections',
  'Confident man with a passion for life',
  'Successful professional seeking interesting conversations',
  'Charming man with a kind heart',
  'Fit and ambitious man looking to chat',
  'Sophisticated gentleman seeking genuine connections',
  'Handsome European man with great conversation skills',
  'Confident man with a contagious smile',
  'Looking for someone to share thoughts and ideas with',
  'Elegant man with a warm and welcoming personality',
  'Successful and charming man seeking connections',
  'Fit man with a passion for meaningful conversations',
  'Handsome gentleman with a great sense of humor',
  'Sophisticated man seeking interesting people to chat with',
  'Confident European man with a kind soul',
  'Charming man with a zest for life',
  'Elegant and ambitious man seeking connections',
  'Looking for someone to share adventures with',
  'Successful professional with a warm heart',
  'Handsome man with great conversation skills',
  'Sophisticated gentleman seeking genuine connections',
  'Fit and confident man looking to connect',
  'Elegant man with a contagious laugh',
  'Charming European man seeking chat partners'
];

const IMAGE_BASE = process.env.IMAGE_BASE_URL || 'https://chat-wazungu-e1ix.onrender.com';
const femalePhotos = Array.from({ length: 60 }, (_, i) => `${IMAGE_BASE}/images/woman_${i + 1}.jpg`);
const malePhotos = Array.from({ length: 40 }, (_, i) => `${IMAGE_BASE}/images/man_${i + 1}.jpg`);

const counties = [
  'Mombasa', 'Kwale', 'Kilifi', 'Tana River', 'Lamu', 'Taita Taveta',
  'Garissa', 'Wajir', 'Mandera', 'Marsabit', 'Isiolo', 'Meru', 'Tharaka-Nithi',
  'Embu', 'Kitui', 'Machakos', 'Makueni', 'Nyandarua', 'Nyeri', 'Kirinyaga',
  'Murang\'a', 'Kiambu', 'Turkana', 'West Pokot', 'Samburu', 'Trans-Nzoia',
  'Uasin Gishu', 'Elgeyo-Marakwet', 'Nandi', 'Baringo', 'Laikipia', 'Nakuru',
  'Narok', 'Kajiado', 'Kericho', 'Bomet', 'Kakamega', 'Vihiga', 'Bungoma',
  'Busia', 'Siaya', 'Kisumu', 'Homa Bay', 'Migori', 'Kisii', 'Nyamira', 'Nairobi'
];

function getRandomCounty() {
  return counties[Math.floor(Math.random() * counties.length)];
}

function getRandomOnlineStatus() {
  return Math.random() > 0.3 ? 'online' : 'offline';
}

function getRandomTags() {
  const allTags = ['Hot', 'Popular', 'New', 'Verified', 'Trending', 'VIP'];
  const numTags = Math.floor(Math.random() * 3) + 1;
  const shuffled = allTags.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, numTags);
}

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const totalProfiles = 200;
    let createdCount = 0;
    let skippedCount = 0;
    let femalePhotoIndex = 0;
    let malePhotoIndex = 0;

    for (const category of categories) {
      console.log(`\n📁 Seeding ${category.name} (${category.count})...`);

      const names = category.gender === 'female' ? femaleNames : maleNames;
      const bios = category.gender === 'female' ? femaleBios : maleBios;
      let photoIndex = category.gender === 'female' ? femalePhotoIndex : malePhotoIndex;

      for (let i = 0; i < category.count; i++) {
        const baseName = names[i % names.length];
        const uniqueName = i >= names.length ? `${baseName} ${Math.floor(i / names.length) + 1}` : baseName;
        const bio = bios[i % bios.length];
        const photo = category.gender === 'female'
          ? femalePhotos[photoIndex % femalePhotos.length]
          : malePhotos[photoIndex % malePhotos.length];
        photoIndex++;
        const county = getRandomCounty();
        
        const age = category.gender === 'female'
          ? Math.floor(Math.random() * 12) + 20
          : Math.floor(Math.random() * 14) + 22;

        const dateOfBirth = new Date();
        dateOfBirth.setFullYear(dateOfBirth.getFullYear() - age);
        dateOfBirth.setHours(0, 0, 0, 0);

        const existing = await User.findOne({ fullName: uniqueName, isDummy: true, category: category.name });
        if (existing) {
          skippedCount++;
          continue;
        }

        const hashedPassword = await bcrypt.hash('dummy123', 10);

        await User.create({
          fullName: uniqueName,
          phoneNumber: `dummy${Date.now()}${i}@chatwazungu.com`,
          password: hashedPassword,
          dateOfBirth,
          gender: category.gender,
          county,
          bio,
          profilePhoto: photo,
          category: category.name,
          lookingFor: '',
          isDummy: true,
          isVerified: true,
          isActive: true,
          onlineStatus: getRandomOnlineStatus(),
          tags: getRandomTags()
        });

        createdCount++;
        process.stdout.write(`\r${category.name}: ${createdCount}/${category.count} profiles created...`);
      }

      if (category.gender === 'female') {
        femalePhotoIndex = photoIndex;
      } else {
        malePhotoIndex = photoIndex;
      }
    }

    console.log(`\n\n✅ Seeding complete!`);
    console.log(`   Created: ${createdCount} profiles`);
    console.log(`   Skipped: ${skippedCount} duplicates`);
    console.log(`   Total in DB: ${createdCount + skippedCount}`);
    console.log(`   Female photos used: ${Math.min(femalePhotoIndex, 100)} unique`);
    console.log(`   Male photos used: ${Math.min(malePhotoIndex, 100)} unique`);
    console.log(`   Photo source: backend /images route (HD 800x1000 white caucasian, gender-matched, generated + cached)`);
    
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error seeding:', error);
    process.exit(1);
  }
}

seed();
