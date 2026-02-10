/**
 * Seed Firestore with initial data (palettes, looks, items)
 * Run this once to populate your Firebase database
 * 
 * Usage: npx ts-node scripts/seedFirestore.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Sample data
const palettes = [
  {
    name: 'Autumn Warmth',
    description: 'Rich, warm tones perfect for fall',
    colors: ['#8B4513', '#D2691E', '#CD853F', '#DEB887', '#F4A460'],
    occasion: 'home',
    weekStartDate: Timestamp.now(),
    isActive: true,
  },
  {
    name: 'Professional Power',
    description: 'Sophisticated neutrals for the office',
    colors: ['#2C3E50', '#34495E', '#7F8C8D', '#95A5A6', '#BDC3C7'],
    occasion: 'work',
    weekStartDate: Timestamp.now(),
    isActive: true,
  },
  {
    name: 'Night Out Glam',
    description: 'Bold, statement colors for evening',
    colors: ['#000000', '#8B0000', '#FFD700', '#C0C0C0', '#FFFFFF'],
    occasion: 'going-out',
    weekStartDate: Timestamp.now(),
    isActive: true,
  },
];

const looks = [
  {
    title: 'Cozy Weekend Vibes',
    description: 'Perfect for relaxing at home',
    imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800',
    occasion: 'home',
    season: ['fall', 'winter'],
    styleKeywords: ['casual', 'comfortable', 'cozy'],
    tags: ['weekend', 'loungewear', 'relaxed'],
    isSponsored: false,
    embedding: [], // Will be generated on first use
  },
  {
    title: 'Power Meeting Ready',
    description: 'Command the boardroom with confidence',
    imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800',
    occasion: 'work',
    season: ['spring', 'fall'],
    styleKeywords: ['professional', 'polished', 'sophisticated'],
    tags: ['business', 'formal', 'office'],
    isSponsored: false,
    embedding: [],
  },
  {
    title: 'Date Night Elegance',
    description: 'Turn heads on your night out',
    imageUrl: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=800',
    occasion: 'going-out',
    season: ['spring', 'summer', 'fall'],
    styleKeywords: ['elegant', 'chic', 'glamorous'],
    tags: ['evening', 'date', 'special-occasion'],
    isSponsored: false,
    embedding: [],
  },
];

const items = [
  {
    name: 'Classic White Button-Down',
    imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800',
    price: 89.99,
    originalPrice: 120.00,
    retailer: 'Everlane',
    affiliateLink: 'https://www.everlane.com',
    category: 'tops',
    color: 'white',
    sizeRange: ['XS', 'S', 'M', 'L', 'XL'],
    brand: 'Everlane',
    inStock: true,
  },
  {
    name: 'High-Waisted Black Trousers',
    imageUrl: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800',
    price: 98.00,
    originalPrice: 145.00,
    retailer: 'Aritzia',
    affiliateLink: 'https://www.aritzia.com',
    category: 'bottoms',
    color: 'black',
    sizeRange: ['0', '2', '4', '6', '8', '10', '12'],
    brand: 'Aritzia',
    inStock: true,
  },
  {
    name: 'Cashmere Sweater',
    imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800',
    price: 198.00,
    originalPrice: 298.00,
    retailer: 'Nordstrom',
    affiliateLink: 'https://www.nordstrom.com',
    category: 'tops',
    color: 'camel',
    sizeRange: ['XS', 'S', 'M', 'L'],
    brand: 'Vince',
    inStock: true,
  },
];

async function seedData() {
  try {
    console.log('🌱 Starting Firestore seeding...\n');

    // Seed palettes
    console.log('📊 Seeding palettes...');
    const paletteIds: string[] = [];
    for (const palette of palettes) {
      const docRef = await addDoc(collection(db, 'palettes'), palette);
      paletteIds.push(docRef.id);
      console.log(`  ✅ Created palette: ${palette.name}`);
    }

    // Seed looks (link to palettes)
    console.log('\n👗 Seeding looks...');
    const lookIds: string[] = [];
    for (let i = 0; i < looks.length; i++) {
      const look = {
        ...looks[i],
        paletteId: paletteIds[i], // Link to corresponding palette
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      const docRef = await addDoc(collection(db, 'looks'), look);
      lookIds.push(docRef.id);
      console.log(`  ✅ Created look: ${look.title}`);
    }

    // Seed items
    console.log('\n🛍️  Seeding items...');
    const itemIds: string[] = [];
    for (const item of items) {
      const itemData = {
        ...item,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      const docRef = await addDoc(collection(db, 'items'), itemData);
      itemIds.push(docRef.id);
      console.log(`  ✅ Created item: ${item.name}`);
    }

    // Link items to looks
    console.log('\n🔗 Linking items to looks...');
    for (let i = 0; i < lookIds.length; i++) {
      const lookItem = {
        lookId: lookIds[i],
        itemId: itemIds[i % itemIds.length],
        itemType: 'hero',
      };
      await addDoc(collection(db, 'lookItems'), lookItem);
      console.log(`  ✅ Linked item to look ${i + 1}`);
    }

    console.log('\n✨ Seeding complete!\n');
    console.log('Summary:');
    console.log(`  - ${paletteIds.length} palettes created`);
    console.log(`  - ${lookIds.length} looks created`);
    console.log(`  - ${itemIds.length} items created`);
    console.log('\n🎉 Your Firebase database is ready!');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

// Run the seeding
seedData().then(() => process.exit(0));
