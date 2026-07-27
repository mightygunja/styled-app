# Firestore Data Population Guide

## Quick Start

### 1. Update Firebase Config
Edit `scripts/populateLooks.ts` with your Firebase credentials:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 2. Install Dependencies
```bash
npm install --save-dev ts-node
```

### 3. Run Population Script
```bash
npx ts-node scripts/populateLooks.ts
```

## Sample Data Included

The script populates **5 sample looks**:

1. **Cozy Weekend Vibes** (Home)
   - Oversized Knit Sweater + Joggers
   - Fall/Winter seasons

2. **Work From Home Chic** (Home)
   - Silk Blouse + Lounge Pants
   - All seasons

3. **Athleisure Comfort** (Home)
   - Sports Bra + Leggings
   - All seasons

4. **Casual Friday Vibes** (Work)
   - Chambray Shirt + Dark Jeans
   - Spring/Fall

5. **Date Night Ready** (Going Out)
   - Little Black Dress + Heels
   - Spring/Summer/Fall

## Data Structure

Each look includes:
- `title` - Look name
- `description` - Brief description
- `occasion` - Primary occasion
- `occasions[]` - Array of applicable occasions
- `season` - Array of seasons
- `paletteId` - Color palette reference
- `tags[]` - Searchable tags
- `imageUrl` - Hero image URL
- `items[]` - Array of items with:
  - `name`, `price`, `retailer`, `brand`
  - `category`, `color`, `imageUrl`
  - `itemType` (hero/alternate/budget)
  - `affiliateLink`

## Adding More Looks

### Option 1: Modify the Script
Add more objects to the `sampleLooks` array in `populateLooks.ts`

### Option 2: Use Firestore Console
1. Go to Firebase Console → Firestore Database
2. Click "Add Collection" → Name it "looks"
3. Add documents manually with the structure above

### Option 3: Import JSON
Create a JSON file and use Firebase Admin SDK:

```typescript
import * as admin from 'firebase-admin';
import * as fs from 'fs';

const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();
const looks = JSON.parse(fs.readFileSync('looks.json', 'utf8'));

async function importLooks() {
  for (const look of looks) {
    await db.collection('looks').add(look);
  }
}
```

## Image Sources

Sample images are from Unsplash (free to use):
- Fashion: `https://unsplash.com/s/photos/fashion`
- Clothing: `https://unsplash.com/s/photos/clothing`
- Outfit: `https://unsplash.com/s/photos/outfit`

Replace with your own product images or affiliate links.

## Affiliate Links

Update `affiliateLink` fields with your actual affiliate URLs:
- Amazon Associates
- RewardStyle/LTK
- ShopStyle Collective
- Rakuten

## Testing

After populating:
1. Open the app
2. Navigate to Home screen
3. Should see 3 "Home" looks
4. Navigate to Work screen
5. Should see 1 "Work" look
6. Navigate to Going Out screen
7. Should see 1 "Going Out" look

## Troubleshooting

**Error: Permission denied**
- Check Firestore Rules allow writes
- Ensure Firebase config is correct

**Error: Collection not found**
- Firestore creates collections on first write
- No need to pre-create

**Images not loading**
- Check image URLs are valid
- Ensure CORS is enabled for image hosts
- Use HTTPS URLs only

## Production Considerations

1. **Image Hosting**: Use Firebase Storage or CDN
2. **Affiliate Links**: Implement link tracking
3. **Data Validation**: Add Firestore security rules
4. **Caching**: Implement client-side caching
5. **Pagination**: Limit queries for performance
6. **Search**: Consider Algolia for full-text search
