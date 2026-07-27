/**
 * Add more diverse looks to Firestore for different occasions
 * Run this to populate more content
 * 
 * Usage: npx ts-node scripts/addMoreLooks.ts
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

const moreLooks = [
  // More HOME looks
  {
    title: 'Lazy Sunday Morning',
    description: 'Comfort meets style for a relaxed day',
    imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800',
    occasion: 'home',
    season: ['spring', 'summer', 'fall'],
    styleKeywords: ['casual', 'relaxed', 'comfortable'],
    tags: ['weekend', 'loungewear', 'brunch'],
    isSponsored: false,
    embedding: [],
  },
  {
    title: 'Cozy Reading Nook',
    description: 'Perfect for curling up with a good book',
    imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800',
    occasion: 'home',
    season: ['fall', 'winter'],
    styleKeywords: ['cozy', 'comfortable', 'soft'],
    tags: ['indoor', 'relaxation', 'comfort'],
    isSponsored: false,
    embedding: [],
  },
  
  // More WORK looks
  {
    title: 'Executive Presence',
    description: 'Make a statement in the boardroom',
    imageUrl: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=800',
    occasion: 'work',
    season: ['spring', 'fall', 'winter'],
    styleKeywords: ['professional', 'powerful', 'sophisticated'],
    tags: ['office', 'business', 'formal'],
    isSponsored: false,
    embedding: [],
  },
  {
    title: 'Smart Casual Friday',
    description: 'Professional yet relaxed for end of week',
    imageUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800',
    occasion: 'work',
    season: ['spring', 'summer', 'fall'],
    styleKeywords: ['smart-casual', 'polished', 'modern'],
    tags: ['office', 'casual-friday', 'versatile'],
    isSponsored: false,
    embedding: [],
  },
  {
    title: 'Creative Professional',
    description: 'Express yourself while staying office-appropriate',
    imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800',
    occasion: 'work',
    season: ['spring', 'summer', 'fall'],
    styleKeywords: ['creative', 'modern', 'stylish'],
    tags: ['office', 'creative', 'trendy'],
    isSponsored: false,
    embedding: [],
  },
  
  // More GOING-OUT looks
  {
    title: 'Cocktail Hour Chic',
    description: 'Sophisticated elegance for evening drinks',
    imageUrl: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800',
    occasion: 'going-out',
    season: ['spring', 'summer', 'fall'],
    styleKeywords: ['elegant', 'chic', 'sophisticated'],
    tags: ['cocktails', 'evening', 'dressy'],
    isSponsored: false,
    embedding: [],
  },
  {
    title: 'Night on the Town',
    description: 'Bold and confident for a memorable night',
    imageUrl: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800',
    occasion: 'going-out',
    season: ['spring', 'summer', 'fall', 'winter'],
    styleKeywords: ['bold', 'glamorous', 'confident'],
    tags: ['nightlife', 'party', 'statement'],
    isSponsored: false,
    embedding: [],
  },
  {
    title: 'Dinner Date Ready',
    description: 'Romantic and elegant for a special evening',
    imageUrl: 'https://images.unsplash.com/photo-1467043237213-65f2da53396f?w=800',
    occasion: 'going-out',
    season: ['spring', 'summer', 'fall'],
    styleKeywords: ['romantic', 'elegant', 'feminine'],
    tags: ['date-night', 'dinner', 'special-occasion'],
    isSponsored: false,
    embedding: [],
  },
];

async function addLooks() {
  try {
    console.log('🌱 Adding more looks to Firestore...\n');

    for (const look of moreLooks) {
      const lookData = {
        ...look,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      const docRef = await addDoc(collection(db, 'looks'), lookData);
      console.log(`  ✅ Created look: ${look.title} (${look.occasion})`);
    }

    console.log('\n✨ Done! Added', moreLooks.length, 'new looks');
    console.log('\nBreakdown:');
    console.log('  - Home:', moreLooks.filter(l => l.occasion === 'home').length, 'looks');
    console.log('  - Work:', moreLooks.filter(l => l.occasion === 'work').length, 'looks');
    console.log('  - Going Out:', moreLooks.filter(l => l.occasion === 'going-out').length, 'looks');

  } catch (error) {
    console.error('❌ Error adding looks:', error);
    process.exit(1);
  }
}

// Run the script
addLooks().then(() => process.exit(0));
