# Deploy Firebase Cloud Functions

## Step 1: Set OpenAI API Key in Firebase

Before deploying, you need to set your OpenAI API key as a Firebase config variable:

```bash
cd c:\dev\Styled\styled-app
firebase functions:config:set openai.key="YOUR_OPENAI_API_KEY"
```

Replace `YOUR_OPENAI_API_KEY` with your actual OpenAI key (starts with `sk-`).

## Step 2: Build Functions

```bash
cd functions
npm run build
```

## Step 3: Deploy Everything

Deploy Firestore rules, Storage rules, and Cloud Functions:

```bash
cd c:\dev\Styled\styled-app
firebase deploy
```

This will deploy:
- ✅ Firestore security rules
- ✅ Storage security rules  
- ✅ Cloud Functions:
  - `classifyGarmentImage` - AI classification
  - `generateImageEmbedding` - CLIP embeddings
  - `findSimilarItems` - Find similar closet items
  - `shopMyCloset` - Find closet items similar to looks

## Step 4: Verify Deployment

After deployment, you'll see URLs for your functions:
```
✔  functions[classifyGarmentImage(us-central1)] Successful create operation.
Function URL: https://us-central1-styled-866b7.cloudfunctions.net/classifyGarmentImage
```

## What Each Function Does:

### `classifyGarmentImage`
- Input: `{ imageUrl: string }`
- Uses GPT-4o Vision to analyze clothing
- Returns: category, color, style, fabric, etc.

### `generateImageEmbedding`
- Input: `{ imageUrl: string }`
- Uses CLIP model to generate 512-dim vector
- Returns: `{ embedding: number[] }`

### `findSimilarItems`
- Input: `{ itemId, userId, limit?, minSimilarity? }`
- Compares embeddings using cosine similarity
- Returns: Similar items with similarity scores

### `shopMyCloset`
- Input: `{ lookId, userId, limit?, minSimilarity? }`
- Finds closet items similar to a look
- Auto-generates look embedding if needed
- Returns: Matching closet items

## Cost Estimate:

**Free Tier:**
- 2M function invocations/month
- 400K GB-seconds compute
- 200K CPU-seconds

**Typical Usage:**
- Upload item: 2 function calls (classify + embed) = ~3 seconds
- Find similar: 1 function call = ~1 second
- Shop my closet: 1 function call = ~2 seconds

**You'll likely stay in free tier unless you have thousands of users!**

## Troubleshooting:

### If deployment fails:
```bash
# Check Firebase login
firebase login

# Check project
firebase projects:list

# Try deploying just functions
firebase deploy --only functions
```

### View function logs:
```bash
firebase functions:log
```

### Test functions locally:
```bash
cd functions
npm run serve
```

---

## Next Steps After Deployment:

1. Update frontend to call Cloud Functions
2. Seed initial data (looks, palettes)
3. Test the app end-to-end
4. Remove old backend!
