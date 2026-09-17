require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const { computeAge } = require('./controllers/profileController');

const femaleNames = [
  'Wanjiku Muthoni', 'Amani Karanja', 'Joyce Wanjala', 'Grace Atieno', 'Grace Akinyi',
  'Mary Wanjiku', 'Margaret Ochieng', 'Joyce Muthoni', 'Wanjiku Mwangi', 'Grace Karanja',
  'Muthoni Njeri', 'Wanjiku Kamau', 'Amani Okeke', 'Joyce Adebayo', 'Wanjiku Oyelaran',
  'Grace Mwangi', 'Muthoni Kariuki', 'Wanjiku Omondi', 'Joyce Nzula', 'Grace Wanjala',
  'Muthoni Ochieng', 'Wanjiku Kirwa', 'Amani Lembo', 'Joyce Mutua', 'Grace Mbeki',
  'Wanjiku Nyongesa', 'Muthoni Amalemba', 'Grace Atieno', 'Wanjiku Achola', 'Joyce Okello',
  'Muthoni Achieng', 'Wanjiku Okeke', 'Grace Nambuya', 'Joyce Kioko', 'Wanjiku Mbithi',
  'Amani Okombo', 'Grace Waswa', 'Muthoni Kiptoo', 'Wanjiku Serem', 'Joyce Tanui',
  'Grace Boke', 'Muthoni Gitau', 'Wanjiku Kiptum', 'Amani Chepkemoi', 'Joyce Langat',
  'Grace Kiptanui', 'Wanjiku Kariuki', 'Muthoni Wanjala', 'Amani Sitonik', 'Joyce Kiprop',
  'Grace Lagat', 'Wanjiku Komen', 'Muthoni Sigei', 'Amani Yator', 'Joyce Kurgat',
  'Grace Tergat', 'Wanjiku Kirui', 'Muthoni Korir', 'Amani Kiptanui', 'Joyce Koech',
  'Grace Ngetich', 'Wanjiku Rotich', 'Muthoni Kiprop', 'Amani Cherono', 'Joyce Mogaka',
  'Grace Kiptoo', 'Wanjiku Kiptanui', 'Muthoni Nyongesa', 'Amani Amwemba', 'Joyce Wangui',
  'Grace Kibochi', 'Wanjiku Muthui', 'Muthoni Ndegwa', 'Amani Kioko', 'Joyce Nambui',
  'Grace Kiptum', 'Wanjiku Kemboi', 'Muthoni Lagat', 'Amani Tanui', 'Joyce Wacera',
  'Grace Ndegwa', 'Wanjiku Mutua', 'Muthoni Achola'
];

const maleNames = [
  'Joseph Muthui', 'James Wambua', 'Daniel Kiptoo', 'Michael Kimani', 'Samuel Osoro',
  'Kevin Ochieng', 'Brian Mutua', 'George Kiptoo', 'Timothy Mwangi', 'Victor Kariuki',
  'Eric Kirui', 'Isaac Kiptanui', 'Denis Koech', 'Daniel Kiprop', 'Michael Kiptoo',
  'Brian Ongala', 'George Wambua', 'Kevin Mwangi', 'Samuel Muthui', 'James Kiptoo',
  'Michael Kiprop', 'Eric Kiptoo', 'Isaac Kiptoo', 'Denis Mwangi', 'Daniel Kamau',
  'George Karanja', 'Brian Mutisya', 'Kevin Kiptoo', 'Samuel Mwangi', 'James Muthui',
  'Michael Kariuki', 'Eric Wambua', 'Isaac Kiptoo', 'Denis Kiprop', 'Daniel Kiptoo',
  'George Ochieng', 'Brian Kiptoo', 'Kevin Muthui', 'Samuel Wambua', 'James Kimani',
  'Michael Osoro', 'Eric Kiptoo', 'Isaac Kiptoo', 'Denis Mutua', 'Daniel Kiptoo',
  'George Kiptoo', 'Brian Wambua', 'Kevin Mwangi', 'Samuel Muthui', 'James Kiptoo',
  'Michael Kiprop', 'Eric Kiptoo', 'Isaac Kiptoo', 'Denis Kiptoo', 'Daniel Mwangi',
  'George Karanja', 'Brian Kiptoo', 'Kevin Muthui', 'Samuel Wambua', 'James Kariuki',
  'Michael Osoro', 'Eric Kiptoo', 'Isaac Kiptoo', 'Denis Mutua', 'Daniel Kiptoo',
  'George Kiptoo', 'Brian Wambua', 'Kevin Mwangi', 'Samuel Muthui', 'James Kiptoo',
  'Michael Kiprop', 'Eric Kiptoo', 'Isaac Kiptoo', 'Denis Kiptoo', 'Daniel Mwangi',
  'George Karanja', 'Brian Kiptoo', 'Kevin Muthui', 'Samuel Wambua', 'James Kariuki',
  'Michael Osoro', 'Eric Kiptoo', 'Isaac Kiptoo', 'Denis Mutua', 'Daniel Kiptoo',
  'George Kiptoo', 'Brian Wambua', 'Kevin Mwangi', 'Samuel Muthui', 'James Kiptoo',
  'Michael Kiprop', 'Eric Kiptoo', 'Isaac Kiptoo', 'Denis Kiptoo', 'Daniel Mwangi',
  'George Karanja', 'Brian Kiptoo', 'Kevin Muthui', 'Samuel Wambua', 'James Kariuki'
];

const sugarMommyBios = [
  'Elegant and successful woman looking for genuine connections',
  'Luxury lifestyle, generous with my time and affection',
  'Mature woman who knows what she wants and gets it',
  'Spoil me with attention and I\'ll spoil you back',
  'Independent, confident, and ready for fun adventures',
  'Looking for a young energetic companion to spoil',
  'Business executive with a heart of gold',
  'Mature beauty seeking youthful energy and charm',
  'Successful entrepreneur looking for exciting connections',
  'Classy woman with modern tastes and desires',
  'Shoe collector',
  'Travel enthusiast with a passion for fine dining',
  'Fashion-forward woman who enjoys the finer things',
  'Looking for someone special to share thoughts with',
  'Brunette goddess ready to brighten your day',
  'Intelligent and charming woman seeking stimulating conversations',
  'Elegant European woman with a contagious smile',
  'Beauty with brains, looking for genuine connections',
  'Sophisticated lady who loves deep conversations',
  'Charming and witty woman seeking interesting men',
  'Looking for someone to share laughter and stories with',
  'Graceful and intelligent woman seeking connection',
  'Radiant beauty with a warm personality',
  'Sophisticated woman with a playful side',
  'Looking for someone to share adventures with',
  'Charming and elegant woman seeking chat partners',
  'Warm and welcoming woman seeking connections',
  'Elegant European woman with great conversation',
  'Beautiful woman with a passionate soul',
  'Successful businesswoman seeking fun and excitement',
  'Generous and captivating woman ready to meet you',
  'Looking for a smart, charming companion',
  'Enthusiastic about life, love, and meaningful conversations',
  'Adventurous spirit looking for someone special',
  'Loving and caring woman who enjoys giving',
  'Experienced, confident woman seeking new connections',
  'Glamorous and fun-loving with a kind heart',
  'Seeking genuine connection with a quality man',
  'Professional woman with a big heart and love for life',
  'Looking for someone who appreciates the good things',
  'Charming, witty, and always up for a good time',
  'Elegant woman with a zest for life and conversation',
  'Warm, compassionate, and seeking special moments',
  'Stylish and sophisticated with great sense of humor',
  'Looking for a connection that goes beyond the surface',
  'Beautiful mind, beautiful soul, beautiful heart',
  'Always positive and love making people happy',
  'Love travelling, good food, and great conversations',
  'Easy-going woman who values honesty and respect'
];

const sugarDaddyBios = [
  'Successful businessman looking to pamper someone special',
  'Established and ready to share my success',
  'Mature man with refined tastes and generosity',
  'Looking for a young companion to spoil',
  'Financial stability meets emotional connection',
  'Entrepreneur seeking beauty and brains',
  'Mature gentleman with generous heart',
  'Ready to treat you like a queen',
  'Sugar daddy with class and style',
  'Looking for meaningful arrangements',
  'Confident, successful, and seeking interesting people',
  'Hoping to find someone who appreciates quality time',
  'Seeking genuine connection with someone special',
  'Looking for a relationship filled with laughter and joy',
  'Successful professional who values companionship',
  'Warm-hearted man seeking a beautiful connection',
  'Adventurous and open-minded, looking for fun',
  'I enjoy the good things in life and sharing them',
  'Seeking someone who brings out the best in me',
  'Generous and respectful man seeking true connection',
  'Looking for a charming woman to share my world',
  'Seeking a beautiful partnership built on trust',
  'I value honesty, respect, and mutual appreciation',
  'Successful, charming, and ready to connect',
  'Looking for someone to share my successes with',
  'Gentleman who values intelligence and grace',
  'Seeking a meaningful relationship with a great woman',
  'Looking for a woman who knows what she wants',
  'Passionate about life, love, and connection',
  'Honest, generous, and seeking someone special',
  'Looking for a connection that feels real and natural',
  'Enjoying life to the fullest and seeking a partner',
  'Successful and seeking a beautiful, genuine connection',
  'Looking for a woman who is both smart and fun',
  'Gentleman who loves good conversation and great times',
  'Seeking a companion for life\'s adventures',
  'Looking for someone who lights up a room',
  'Valuing respect, trust, and genuine chemistry',
  'I love making someone feel special and appreciated',
  'Successful businessman with a heart of gold',
  'Seeking a genuine connection with someone wonderful',
  'Looking for a woman who is confident and charming',
  'I enjoy the journey as much as the destination',
  'Seeking a relationship that is both fun and meaningful',
  'Kind, generous, and looking for love',
  'Looking for a great woman to share my life with',
  'Enjoying success and seeking a beautiful partner',
  'Seeking a smart, confident, and gorgeous woman',
  'I believe in treating a lady like the queen she is',
  'Looking for a warm, loving, and genuine connection',
  'Seeking someone who values quality time and honesty'
];

const counties = [
  'Nairobi', 'Mombasa', 'Kwale', 'Kilifi', 'Tana River', 'Lamu', 'Taita Taveta',
  'Garissa', 'Wajir', 'Mandera', 'Marsabit', 'Isiolo', 'Meru', 'Tharaka-Nithi',
  'Embu', 'Kitui', 'Machakos', 'Makueni', 'Nyandarua', 'Nyeri', 'Kirinyaga',
  'Murang\'a', 'Kiambu', 'Turkana', 'West Pokot', 'Samburu', 'Trans-Nzoia',
  'Uasin Gishu', 'Elgeyo-Marakwet', 'Nandi', 'Baringo', 'Laikipia', 'Nakuru',
  'Narok', 'Kajiado', 'Kericho', 'Bomet', 'Kakamega', 'Vihiga', 'Bungoma',
  'Busia', 'Siaya', 'Kisumu', 'Homa Bay', 'Migori', 'Kisii', 'Nyamira'
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const existing = await User.countDocuments({ isDummy: true });
    if (existing > 0) {
      console.log(`Skipping seed: ${existing} dummy profiles already exist`);
      await mongoose.disconnect();
      return;
    }

    let createdCount = 0;

    for (let i = 0; i < 45; i++) {
      const age = 35 + Math.floor(Math.random() * 20);
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - age);
      dateOfBirth.setHours(0, 0, 0, 0);

      const name = femaleNames[i % femaleNames.length];
      const bio = sugarMommyBios[i % sugarMommyBios.length];
      const county = counties[Math.floor(Math.random() * counties.length)];

      await User.create({
        fullName: name,
        phoneNumber: `sugar+mummy${i}@chatwazungu.com`,
        password: await bcrypt.hash('dummy123', 10),
        dateOfBirth,
        gender: 'female',
        county,
        bio,
        profilePhoto: `/cache/profiles/woman_${(i % 60) + 1}.jpg`,
        category: 'Sugar Mommy',
        lookingFor: 'Sugar Daddy',
        isDummy: true,
        isVerified: true,
        isActive: true,
        onlineStatus: Math.random() > 0.3 ? 'online' : 'offline',
        tags: ['New']
      });
      createdCount++;
      process.stdout.write(`\rSugar Mommy: ${createdCount}/45...`);
    }

    for (let i = 0; i < 45; i++) {
      const age = 40 + Math.floor(Math.random() * 25);
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - age);
      dateOfBirth.setHours(0, 0, 0, 0);

      const name = maleNames[i % maleNames.length];
      const bio = sugarDaddyBios[i % sugarDaddyBios.length];
      const county = counties[Math.floor(Math.random() * counties.length)];

      await User.create({
        fullName: name,
        phoneNumber: `sugar+daddy${i}@chatwazungu.com`,
        password: await bcrypt.hash('dummy123', 10),
        dateOfBirth,
        gender: 'male',
        county,
        bio,
        profilePhoto: `/cache/profiles/man_${(i % 40) + 1}.jpg`,
        category: 'Sugar Daddy',
        lookingFor: 'Sugar Mommy',
        isDummy: true,
        isVerified: true,
        isActive: true,
        onlineStatus: Math.random() > 0.3 ? 'online' : 'offline',
        tags: ['New']
      });
      createdCount++;
      process.stdout.write(`\rSugar Daddy: ${i + 1}/45...`);
    }

    console.log(`\nDone! Created 90 profiles (45 Sugar Mommy, 45 Sugar Daddy)`);
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

seed();
