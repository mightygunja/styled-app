/**
 * Script to populate Firestore with sample look data
 * Run with: npx ts-node scripts/populateLooks.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

// Firebase config - replace with your actual config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const sampleLooks = [
  {
    title: "Cozy Weekend Vibes",
    description: "Perfect for lazy Sundays at home",
    occasion: "home",
    paletteId: "palette_001",
    tags: ["casual", "comfortable", "weekend"],
    createdAt: new Date().toISOString(),
    imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400",
    items: [
      {
        id: "item_001",
        name: "Oversized Knit Sweater",
        imageUrl: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400",
        price: 49.99,
        retailer: "Nordstrom",
        affiliateLink: "https://example.com/sweater",
        category: "tops",
        color: "beige",
        brand: "Everlane",
        itemType: "hero",
      },
      {
        id: "item_002",
        name: "High-Waisted Joggers",
        imageUrl: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400",
        price: 39.99,
        retailer: "Athleta",
        affiliateLink: "https://example.com/joggers",
        category: "bottoms",
        color: "gray",
        brand: "Athleta",
        itemType: "alternate",
      }
    ],
    occasions: ["home", "casual"],
    season: ["fall", "winter"],
  },
  {
    title: "Work From Home Chic",
    description: "Look professional on video calls",
    occasion: "home",
    paletteId: "palette_002",
    tags: ["professional", "comfortable", "wfh"],
    createdAt: new Date().toISOString(),
    imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400",
    items: [
      {
        id: "item_003",
        name: "Silk Blouse",
        imageUrl: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=400",
        price: 68.00,
        retailer: "Everlane",
        affiliateLink: "https://example.com/blouse",
        category: "tops",
        color: "white",
        brand: "Everlane",
        itemType: "hero",
      },
      {
        id: "item_004",
        name: "Lounge Pants",
        imageUrl: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400",
        price: 45.00,
        retailer: "Uniqlo",
        affiliateLink: "https://example.com/pants",
        category: "bottoms",
        color: "black",
        brand: "Uniqlo",
        itemType: "alternate",
      }
    ],
    occasions: ["home", "work"],
    season: ["spring", "summer", "fall", "winter"],
  },
  {
    title: "Athleisure Comfort",
    description: "Perfect for yoga or Netflix",
    occasion: "home",
    paletteId: "palette_003",
    tags: ["athleisure", "yoga", "comfortable"],
    createdAt: new Date().toISOString(),
    imageUrl: "https://images.unsplash.com/photo-1544441893-675973e31985?w=400",
    items: [
      {
        id: "item_005",
        name: "Sports Bra",
        imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400",
        price: 32.00,
        retailer: "Lululemon",
        affiliateLink: "https://example.com/sportsbra",
        category: "tops",
        color: "black",
        brand: "Lululemon",
        itemType: "hero",
      },
      {
        id: "item_006",
        name: "High-Waisted Leggings",
        imageUrl: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400",
        price: 78.00,
        retailer: "Lululemon",
        affiliateLink: "https://example.com/leggings",
        category: "bottoms",
        color: "black",
        brand: "Lululemon",
        itemType: "alternate",
      }
    ],
    occasions: ["home", "casual"],
    season: ["spring", "summer", "fall", "winter"],
  },
  {
    title: "Casual Friday Vibes",
    description: "Relaxed but put-together",
    occasion: "work",
    paletteId: "palette_004",
    tags: ["casual", "friday", "office"],
    createdAt: new Date().toISOString(),
    imageUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400",
    items: [
      {
        id: "item_007",
        name: "Chambray Shirt",
        imageUrl: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400",
        price: 55.00,
        retailer: "Madewell",
        affiliateLink: "https://example.com/chambray",
        category: "tops",
        color: "blue",
        brand: "Madewell",
        itemType: "hero",
      },
      {
        id: "item_008",
        name: "Dark Wash Jeans",
        imageUrl: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400",
        price: 89.00,
        retailer: "Levi's",
        affiliateLink: "https://example.com/jeans",
        category: "bottoms",
        color: "blue",
        brand: "Levi's",
        itemType: "alternate",
      }
    ],
    occasions: ["work", "casual"],
    season: ["spring", "fall"],
  },
  {
    title: "Date Night Ready",
    description: "Effortlessly elegant",
    occasion: "going_out",
    paletteId: "palette_005",
    tags: ["date", "elegant", "evening"],
    createdAt: new Date().toISOString(),
    imageUrl: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400",
    items: [
      {
        id: "item_009",
        name: "Little Black Dress",
        imageUrl: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400",
        price: 120.00,
        retailer: "Reformation",
        affiliateLink: "https://example.com/lbd",
        category: "dresses",
        color: "black",
        brand: "Reformation",
        itemType: "hero",
      },
      {
        id: "item_010",
        name: "Strappy Heels",
        imageUrl: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400",
        price: 95.00,
        retailer: "Sam Edelman",
        affiliateLink: "https://example.com/heels",
        category: "shoes",
        color: "black",
        brand: "Sam Edelman",
        itemType: "alternate",
      }
    ],
    occasions: ["going_out", "date"],
    season: ["spring", "summer", "fall"],
  },
];

async function populateLooks() {
  console.log('Starting to populate looks...');
  
  try {
    for (const look of sampleLooks) {
      const docRef = await addDoc(collection(db, 'looks'), look);
      console.log(`✓ Added look: ${look.title} (ID: ${docRef.id})`);
    }
    
    console.log(`\n✅ Successfully added ${sampleLooks.length} looks to Firestore!`);
  } catch (error) {
    console.error('❌ Error adding looks:', error);
  }
}

// Run the script
populateLooks();
