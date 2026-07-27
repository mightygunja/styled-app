# Firebase Setup Guide for Styled App

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name it "Styled" (or your preferred name)
4. Disable Google Analytics (optional for now)
5. Click "Create project"

## Step 2: Register Your App

1. In Firebase Console, click the **Web** icon (</>) to add a web app
2. Register app name: "Styled Web"
3. **Copy the Firebase configuration** - you'll need this!

## Step 3: Enable Firestore Database

1. In Firebase Console, go to **Build** → **Firestore Database**
2. Click "Create database"
3. Choose **Start in test mode** (we'll add security rules later)
4. Select your preferred location (e.g., us-central)
5. Click "Enable"

## Step 4: Enable Firebase Storage

1. Go to **Build** → **Storage**
2. Click "Get started"
3. Start in **test mode**
4. Use same location as Firestore
5. Click "Done"

## Step 5: Enable Firebase Functions

1. Go to **Build** → **Functions**
2. Click "Get started"
3. Upgrade to **Blaze plan** (pay-as-you-go)
   - Required for Cloud Functions
   - Free tier is generous: 2M invocations/month
   - You'll only pay if you exceed free tier

## Step 6: Add Firebase Config to Your App

1. Copy your Firebase config from Step 2
2. Update `styled-app/.env`:

```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id

# Keep these for Cloud Functions
EXPO_PUBLIC_OPENAI_API_KEY=your-openai-key
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
EXPO_PUBLIC_CLOUDINARY_API_KEY=your-cloudinary-key
EXPO_PUBLIC_CLOUDINARY_API_SECRET=your-cloudinary-secret
```

## Step 7: Set Up Firestore Collections

Your Firestore will have these collections:
- `users` - User profiles and preferences
- `closetItems` - User's closet items with embeddings
- `looks` - Curated looks with embeddings
- `palettes` - Trend palettes
- `items` - Shoppable items
- `favoriteLooks` - User favorites

Collections will be created automatically when you add data!

## Step 8: Deploy Cloud Functions (After Migration)

```bash
cd styled-app/functions
npm install
firebase deploy --only functions
```

## Security Rules (Add Later)

We'll start in test mode, then add proper security rules to ensure users can only access their own data.

## Cost Estimate

**Free Tier Includes:**
- Firestore: 50K reads, 20K writes, 20K deletes per day
- Storage: 5GB storage, 1GB/day downloads
- Functions: 2M invocations, 400K GB-seconds per month
- Authentication: Unlimited users

**For typical usage, you'll likely stay in free tier!**

## Next Steps

1. Complete the Firebase Console setup above
2. Add your Firebase config to `.env`
3. I'll migrate all your backend logic to Firebase
4. Test everything
5. Remove the old backend!

---

**Ready?** Once you've completed Steps 1-6, let me know and I'll continue the migration!
