/**
 * Seed Firestore with sample social profiles + posts so the Social Feed
 * isn't empty for the current single-mock-user app.
 *
 * Usage: npx ts-node scripts/seedSocialData.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, addDoc, Timestamp, getDocs, query, where } from 'firebase/firestore';
import * as dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const sampleUsers = [
  {
    userId: 'user-1',
    displayName: 'Emma Style',
    username: 'emmastyle',
    bio: 'Minimalist fashion lover 🤍',
    profileImageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200',
    location: 'Los Angeles, CA',
    styleTags: ['minimalist', 'modern'],
    isPrivate: false,
    stats: { followers: 1234, following: 456, posts: 0, looks: 234 },
  },
  {
    userId: 'user-2',
    displayName: 'Fashion Forward',
    username: 'fashionforward',
    bio: 'Trendsetter | Style blogger ✨',
    profileImageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    location: 'New York, NY',
    styleTags: ['trendy', 'bold'],
    isPrivate: false,
    stats: { followers: 5678, following: 234, posts: 0, looks: 445 },
  },
  {
    userId: 'user-3',
    displayName: 'Vintage Vibes',
    username: 'vintagevibes',
    bio: 'Vintage fashion enthusiast 🕰️',
    profileImageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200',
    location: 'Portland, OR',
    styleTags: ['vintage', 'retro'],
    isPrivate: false,
    stats: { followers: 890, following: 345, posts: 0, looks: 178 },
  },
];

const samplePosts = [
  {
    userId: 'user-1',
    type: 'transformation' as const,
    images: [
      'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600',
    ],
    caption:
      "Amazing transformation after my closet audit! 😍 Feeling so much more confident in my style now. #transformation #stylejourney",
    hashtags: ['transformation', 'stylejourney', 'closetaudit'],
    privacy: 'public' as const,
    likes: 234,
    comments: 0,
    shares: 12,
    saves: 45,
  },
  {
    userId: 'user-2',
    type: 'outfit' as const,
    images: ['https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600'],
    caption: "Today's outfit for the office 💼 Keeping it professional yet stylish! #ootd #workwear",
    hashtags: ['ootd', 'workwear', 'professional'],
    privacy: 'public' as const,
    likes: 156,
    comments: 0,
    shares: 8,
    saves: 32,
  },
  {
    userId: 'user-3',
    type: 'closet' as const,
    images: ['https://images.unsplash.com/photo-1558769132-cb1aea1c8e5d?w=600'],
    caption: 'Finally organized my closet! ✨ Minimalist approach is the way to go. #organization #minimalist',
    hashtags: ['organization', 'minimalist', 'closetgoals'],
    privacy: 'public' as const,
    likes: 189,
    comments: 0,
    shares: 10,
    saves: 67,
  },
  {
    userId: 'user-1',
    type: 'tip' as const,
    images: ['https://images.unsplash.com/photo-1445205170230-053b83016050?w=600'],
    caption: 'Pro tip: neutral basics are the foundation of a capsule wardrobe. Build up from there! #styletips',
    hashtags: ['styletips', 'minimalist', 'capsulewardrobe'],
    privacy: 'public' as const,
    likes: 98,
    comments: 0,
    shares: 4,
    saves: 21,
  },
];

const sampleComments = [
  { postIndex: 0, userId: 'user-2', text: 'Love this outfit! 😍' },
  { postIndex: 0, userId: 'user-3', text: 'You look amazing!' },
  { postIndex: 1, userId: 'user-1', text: 'Where did you get that blazer?' },
];

async function seed() {
  console.log('Seeding sample user profiles...');
  for (const user of sampleUsers) {
    const { userId, ...profile } = user;
    await setDoc(doc(db, 'userProfiles', userId), { userId, ...profile, createdAt: Timestamp.now() });
    console.log(`  - ${profile.displayName} (${userId})`);
  }

  console.log('Checking for existing seeded posts...');
  const existing = await getDocs(query(collection(db, 'posts'), where('userId', 'in', ['user-1', 'user-2', 'user-3'])));
  if (!existing.empty) {
    console.log(`Found ${existing.size} existing sample posts, skipping post seeding.`);
    return;
  }

  console.log('Seeding sample posts...');
  const postIds: string[] = [];
  for (const post of samplePosts) {
    const ref = await addDoc(collection(db, 'posts'), {
      ...post,
      createdAt: Timestamp.fromMillis(Date.now() - Math.random() * 8 * 60 * 60 * 1000),
    });
    postIds.push(ref.id);
    console.log(`  - post by ${post.userId}: "${post.caption.slice(0, 40)}..."`);
  }

  console.log('Seeding sample comments...');
  for (const comment of sampleComments) {
    const postId = postIds[comment.postIndex];
    await addDoc(collection(db, 'postComments'), {
      postId,
      userId: comment.userId,
      text: comment.text,
      likes: 0,
      createdAt: Timestamp.now(),
    });
  }

  console.log('Done!');
}

seed()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
