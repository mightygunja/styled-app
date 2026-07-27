/**
 * Re-seed Firestore with looks and matching items
 * This creates coherent looks where items actually match the style
 * 
 * Usage: npx ts-node scripts/reseedWithMatchingItems.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, Timestamp } from 'firebase/firestore';
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

// Coherent looks with matching items
const looksWithItems = [
  // HOME LOOK 1
  {
    look: {
      title: 'Cozy Weekend Vibes',
      description: 'Perfect for relaxing at home in comfort and style',
      imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800',
      occasion: 'home',
      season: ['fall', 'winter'],
      styleKeywords: ['casual', 'comfortable', 'cozy'],
      tags: ['weekend', 'loungewear', 'relaxed'],
      isSponsored: false,
      embedding: [],
    },
    items: [
      {
        name: 'Oversized Cashmere Sweater',
        imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800',
        price: 198.00,
        originalPrice: 298.00,
        retailer: 'Nordstrom',
        affiliateLink: 'https://www.nordstrom.com',
        category: 'tops',
        color: 'camel',
        brand: 'Vince',
        itemType: 'hero',
      },
      {
        name: 'Soft Jogger Pants',
        imageUrl: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800',
        price: 68.00,
        originalPrice: 98.00,
        retailer: 'Athleta',
        affiliateLink: 'https://www.athleta.com',
        category: 'bottoms',
        color: 'gray',
        brand: 'Athleta',
        itemType: 'alternate',
      },
    ],
  },
  
  // HOME LOOK 2
  {
    look: {
      title: 'Lazy Sunday Morning',
      description: 'Effortlessly chic for a relaxed day at home',
      imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800',
      occasion: 'home',
      season: ['spring', 'summer'],
      styleKeywords: ['casual', 'relaxed', 'comfortable'],
      tags: ['weekend', 'brunch', 'easy'],
      isSponsored: false,
      embedding: [],
    },
    items: [
      {
        name: 'Linen Button-Up Shirt',
        imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800',
        price: 89.00,
        originalPrice: 120.00,
        retailer: 'Everlane',
        affiliateLink: 'https://www.everlane.com',
        category: 'tops',
        color: 'white',
        brand: 'Everlane',
        itemType: 'hero',
      },
      {
        name: 'High-Waisted Denim Shorts',
        imageUrl: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800',
        price: 78.00,
        originalPrice: 98.00,
        retailer: 'Madewell',
        affiliateLink: 'https://www.madewell.com',
        category: 'bottoms',
        color: 'blue',
        brand: 'Madewell',
        itemType: 'alternate',
      },
    ],
  },
  
  // WORK LOOK 1
  {
    look: {
      title: 'Power Meeting Ready',
      description: 'Command the boardroom with confidence and style',
      imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800',
      occasion: 'work',
      season: ['spring', 'fall', 'winter'],
      styleKeywords: ['professional', 'polished', 'sophisticated'],
      tags: ['business', 'formal', 'office'],
      isSponsored: false,
      embedding: [],
    },
    items: [
      {
        name: 'Tailored Blazer',
        imageUrl: 'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=800',
        price: 298.00,
        originalPrice: 450.00,
        retailer: 'Theory',
        affiliateLink: 'https://www.theory.com',
        category: 'outerwear',
        color: 'black',
        brand: 'Theory',
        itemType: 'hero',
      },
      {
        name: 'High-Waisted Trousers',
        imageUrl: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800',
        price: 145.00,
        originalPrice: 198.00,
        retailer: 'Aritzia',
        affiliateLink: 'https://www.aritzia.com',
        category: 'bottoms',
        color: 'black',
        brand: 'Aritzia',
        itemType: 'alternate',
      },
      {
        name: 'Silk Blouse',
        imageUrl: 'https://images.unsplash.com/photo-1618932260643-eee4a2f652a6?w=800',
        price: 128.00,
        originalPrice: 168.00,
        retailer: 'J.Crew',
        affiliateLink: 'https://www.jcrew.com',
        category: 'tops',
        color: 'ivory',
        brand: 'J.Crew',
        itemType: 'alternate',
      },
    ],
  },
  
  // WORK LOOK 2
  {
    look: {
      title: 'Executive Presence',
      description: 'Sophisticated style for the modern professional',
      imageUrl: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=800',
      occasion: 'work',
      season: ['fall', 'winter', 'spring'],
      styleKeywords: ['professional', 'powerful', 'elegant'],
      tags: ['office', 'business', 'executive'],
      isSponsored: false,
      embedding: [],
    },
    items: [
      {
        name: 'Structured Sheath Dress',
        imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800',
        price: 198.00,
        originalPrice: 268.00,
        retailer: 'Banana Republic',
        affiliateLink: 'https://www.bananarepublic.com',
        category: 'dresses',
        color: 'navy',
        brand: 'Banana Republic',
        itemType: 'hero',
      },
      {
        name: 'Classic Pumps',
        imageUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800',
        price: 395.00,
        originalPrice: 495.00,
        retailer: 'Cole Haan',
        affiliateLink: 'https://www.colehaan.com',
        category: 'shoes',
        color: 'black',
        brand: 'Cole Haan',
        itemType: 'alternate',
      },
    ],
  },
  
  // GOING OUT LOOK 1
  {
    look: {
      title: 'Date Night Elegance',
      description: 'Romantic and sophisticated for a special evening',
      imageUrl: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=800',
      occasion: 'going-out',
      season: ['spring', 'summer', 'fall'],
      styleKeywords: ['elegant', 'romantic', 'chic'],
      tags: ['date', 'evening', 'special-occasion'],
      isSponsored: false,
      embedding: [],
    },
    items: [
      {
        name: 'Silk Slip Dress',
        imageUrl: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800',
        price: 248.00,
        originalPrice: 328.00,
        retailer: 'Reformation',
        affiliateLink: 'https://www.thereformation.com',
        category: 'dresses',
        color: 'burgundy',
        brand: 'Reformation',
        itemType: 'hero',
      },
      {
        name: 'Strappy Heeled Sandals',
        imageUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800',
        price: 295.00,
        originalPrice: 395.00,
        retailer: 'Sam Edelman',
        affiliateLink: 'https://www.samedelman.com',
        category: 'shoes',
        color: 'nude',
        brand: 'Sam Edelman',
        itemType: 'alternate',
      },
    ],
  },
  
  // GOING OUT LOOK 2
  {
    look: {
      title: 'Night on the Town',
      description: 'Bold and confident for an unforgettable night',
      imageUrl: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800',
      occasion: 'going-out',
      season: ['fall', 'winter', 'spring'],
      styleKeywords: ['bold', 'glamorous', 'statement'],
      tags: ['nightlife', 'party', 'cocktails'],
      isSponsored: false,
      embedding: [],
    },
    items: [
      {
        name: 'Sequin Mini Dress',
        imageUrl: 'https://images.unsplash.com/photo-1612336307429-8a898d10e223?w=800',
        price: 178.00,
        originalPrice: 248.00,
        retailer: 'ASOS',
        affiliateLink: 'https://www.asos.com',
        category: 'dresses',
        color: 'black',
        brand: 'ASOS Design',
        itemType: 'hero',
      },
      {
        name: 'Statement Heels',
        imageUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800',
        price: 425.00,
        originalPrice: 595.00,
        retailer: 'Steve Madden',
        affiliateLink: 'https://www.stevemadden.com',
        category: 'shoes',
        color: 'silver',
        brand: 'Steve Madden',
        itemType: 'alternate',
      },
    ],
  },
];

async function clearOldData() {
  console.log('🗑️  Clearing old data...\n');
  
  // Clear lookItems
  const lookItemsSnapshot = await getDocs(collection(db, 'lookItems'));
  for (const doc of lookItemsSnapshot.docs) {
    await deleteDoc(doc.ref);
  }
  console.log('  ✅ Cleared lookItems');
  
  // Clear items
  const itemsSnapshot = await getDocs(collection(db, 'items'));
  for (const doc of itemsSnapshot.docs) {
    await deleteDoc(doc.ref);
  }
  console.log('  ✅ Cleared items');
  
  // Clear looks
  const looksSnapshot = await getDocs(collection(db, 'looks'));
  for (const doc of looksSnapshot.docs) {
    await deleteDoc(doc.ref);
  }
  console.log('  ✅ Cleared looks\n');
}

async function seedCoherentData() {
  try {
    console.log('🌱 Starting coherent data seeding...\n');

    await clearOldData();

    for (const lookWithItems of looksWithItems) {
      // Create look
      const lookData = {
        ...lookWithItems.look,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      const lookDoc = await addDoc(collection(db, 'looks'), lookData);
      console.log(`📸 Created look: ${lookWithItems.look.title}`);

      // Create items and link them
      for (const item of lookWithItems.items) {
        const itemData = {
          ...item,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          inStock: true,
          sizeRange: ['XS', 'S', 'M', 'L', 'XL'],
        };
        
        // Remove itemType before saving to items collection
        const { itemType, ...itemWithoutType } = itemData;
        const itemDoc = await addDoc(collection(db, 'items'), itemWithoutType);
        
        // Create lookItem link
        await addDoc(collection(db, 'lookItems'), {
          lookId: lookDoc.id,
          itemId: itemDoc.id,
          itemType: itemType,
        });
        
        console.log(`  🛍️  Added ${item.name} (${itemType})`);
      }
      console.log('');
    }

    console.log('✨ Seeding complete!\n');
    console.log('Summary:');
    console.log(`  - ${looksWithItems.length} looks created`);
    console.log(`  - ${looksWithItems.reduce((sum, l) => sum + l.items.length, 0)} items created`);
    console.log('\nBreakdown by occasion:');
    console.log('  - Home:', looksWithItems.filter(l => l.look.occasion === 'home').length, 'looks');
    console.log('  - Work:', looksWithItems.filter(l => l.look.occasion === 'work').length, 'looks');
    console.log('  - Going Out:', looksWithItems.filter(l => l.look.occasion === 'going-out').length, 'looks');
    console.log('\n🎉 Your looks now have matching items!');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

// Run the seeding
seedCoherentData().then(() => process.exit(0));
