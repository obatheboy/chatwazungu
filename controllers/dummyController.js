const User = require('../models/User');
const bcrypt = require('bcryptjs');

const WOMEN_PHOTO_COUNT = 35;
const MEN_PHOTO_COUNT = 35;

const femalePhotos = Array.from({ length: WOMEN_PHOTO_COUNT }, (_, i) => `/cache/profiles/woman_${i + 1}.jpg`);
const malePhotos = Array.from({ length: MEN_PHOTO_COUNT }, (_, i) => `/cache/profiles/man_${i + 1}.jpg`);

const femaleFirstNames = [
  'Emma', 'Olivia', 'Ava', 'Sophia', 'Isabella', 'Mia', 'Charlotte', 'Amelia', 'Harper', 'Evelyn',
  'Abigail', 'Emily', 'Elizabeth', 'Ella', 'Grace', 'Victoria', 'Chloe', 'Zoey', 'Lily', 'Hannah',
  'Addison', 'Natalie', 'Brooklyn', 'Zoe', 'Leah', 'Audrey', 'Savannah', 'Claire', 'Aaliyah', 'Anna',
  'Aria', 'Ellie', 'Scarlett', 'Maya', 'Aubrey', 'Bella', 'Riley', 'Aurora', 'Layla', 'Penelope'
];

const maleFirstNames = [
  'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles',
  'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua',
  'Kenneth', 'Kevin', 'Brian', 'George', 'Timothy', 'Ronald', 'Edward', 'Jason', 'Jeffrey', 'Ryan',
  'Jacob', 'Nicholas', 'Tyler', 'Benjamin', 'Samuel', 'Gregory', 'Frank', 'Alexander', 'Raymond'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores'
];

const dummyProfiles = {
  'Sugar Mommy': [
    { names: femaleFirstNames.map((fn, i) => `${fn} ${lastNames[i % lastNames.length]}`), ages: Array.from({length: 40}, () => Math.floor(Math.random() * 15) + 35), bios: ['Elegant and successful woman seeking companionship and fun', 'Luxury lifestyle, generous with my time and affection', 'Mature woman who knows what she wants and gets it', 'Spoil me with attention and I\'ll spoil you back', 'Independent, confident, and ready for fun adventures', 'Looking for a young energetic companion to spoil', 'Business executive with a heart of gold', 'Mature beauty seeking youthful energy and charm', 'Successful entrepreneur looking for exciting connections', 'Classy woman with modern tastes and desires'] },
  ],
  'Sugar Daddy': [
    { names: maleFirstNames.map((fn, i) => `${fn} ${lastNames[i % lastNames.length]}`), ages: Array.from({length: 40}, () => Math.floor(Math.random() * 15) + 40), bios: ['Successful businessman looking to pamper someone special', 'Established and ready to share my success', 'Mature man with refined tastes and generosity', 'Looking for a young companion to spoil', 'Financial stability meets emotional connection', 'Entrepreneur seeking beauty and brains', 'Mature gentleman with generous heart', 'Ready to treat you like a queen', 'Sugar daddy with class and style', 'Looking for meaningful arrangements'] },
  ],
  'Young Boy': [
    { names: maleFirstNames.slice(0, 20).map((fn, i) => `${fn} ${lastNames[i % lastNames.length]}`), ages: Array.from({length: 40}, () => Math.floor(Math.random() * 8) + 20), bios: ['Young and energetic college student', 'Looking for mature connections', 'Fit and ready for adventure', 'Young soul with old heart', 'Student seeking mentorship and fun', 'Energetic and enthusiastic', 'Ready to learn from someone experienced', 'Young and hungry for success', 'College boy with big dreams', 'Seeking sugar mommy guidance'] },
  ],
  'Young Man': [
    { names: maleFirstNames.slice(10, 30).map((fn, i) => `${fn} ${lastNames[(i + 10) % lastNames.length]}`), ages: Array.from({length: 40}, () => Math.floor(Math.random() * 10) + 22), bios: ['Young professional with big dreams', 'Focused on success and connections', 'Fitness enthusiast and goal setter', 'Looking for meaningful relationships', 'Ambitious young man on the rise', 'Career-driven and relationship-ready', 'Young man with maturity beyond years', 'Seeking genuine connections', 'Professional with a playful side', 'Ready for something real'] },
  ]
};

const counties = ['Mombasa', 'Kwale', 'Kilifi', 'Tana River', 'Lamu', 'Taita Taveta', 'Garissa', 'Wajir', 'Mandera', 'Marsabit', 'Isiolo', 'Meru', 'Tharaka-Nithi', 'Embu', 'Kitui', 'Machakos', 'Makueni', 'Nyandarua', 'Nyeri', 'Kirinyaga', 'Murang\'a', 'Kiambu', 'Turkana', 'West Pokot', 'Samburu', 'Trans-Nzoia', 'Uasin Gishu', 'Elgeyo-Marakwet', 'Nandi', 'Baringo', 'Laikipia', 'Nakuru', 'Narok', 'Kajiado', 'Kericho', 'Bomet', 'Kakamega', 'Vihiga', 'Bungoma', 'Busia', 'Siaya', 'Kisumu', 'Homa Bay', 'Migori', 'Kisii', 'Nyamira', 'Nairobi'];

function getLookingFor(category) {
  const map = {
    'Sugar Mommy': ['Young Boy', 'Young Man'],
    'Sugar Daddy': ['Young Boy', 'Young Man'],
    'Young Boy': ['Sugar Mommy', 'Sugar Daddy'],
    'Young Man': ['Sugar Mommy', 'Sugar Daddy']
  };
  return map[category] || ['Young Woman'];
}

function getRandomTags() {
  const allTags = ['Hot', 'Popular', 'New', 'Verified', 'Trending', 'VIP'];
  const numTags = Math.floor(Math.random() * 3) + 1;
  const shuffled = allTags.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, numTags);
}

const generateDummyProfiles = async (req, res) => {
  try {
    const countPerCategory = parseInt(req.query.count) || 50;
    let createdCount = 0;
    let femalePhotoIndex = 0;
    let malePhotoIndex = 0;

    for (const [category, templates] of Object.entries(dummyProfiles)) {
      for (let i = 0; i < countPerCategory; i++) {
        const template = templates[i % templates.length];
        const name = template.names[i % template.names.length];
        const age = template.ages[i % template.ages.length];
        const bio = template.bios[i % template.bios.length];
        const county = counties[Math.floor(Math.random() * counties.length)];
        const gender = category.includes('Boy') || category.includes('Man') ? 'male' : 'female';
        
        let photo;
        if (gender === 'female') {
          photo = femalePhotos[femalePhotoIndex % femalePhotos.length];
          femalePhotoIndex++;
        } else {
          photo = malePhotos[malePhotoIndex % malePhotos.length];
          malePhotoIndex++;
        }

        const dateOfBirth = new Date();
        dateOfBirth.setFullYear(dateOfBirth.getFullYear() - age);

        const existing = await User.findOne({ fullName: name, isDummy: true });
        if (existing) continue;

        const hashedPassword = await bcrypt.hash('dummy123', 10);

        await User.create({
          fullName: name,
          phoneNumber: `dummy${Date.now()}${i}@chatwazungu.com`,
          password: hashedPassword,
          dateOfBirth,
          gender,
          county,
          bio,
          profilePhoto: photo,
          category,
          lookingFor: getLookingFor(category),
          isDummy: true,
          isVerified: true,
          isActive: true,
          onlineStatus: Math.random() > 0.3 ? 'online' : 'offline',
          tags: getRandomTags()
        });

        createdCount++;
      }
    }

    res.json({
      success: true,
      message: `Generated ${createdCount} dummy profiles`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getDummyProfiles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const profiles = await User.find({ isDummy: true })
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments({ isDummy: true });

    res.json({
      success: true,
      profiles,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  generateDummyProfiles,
  getDummyProfiles
};
