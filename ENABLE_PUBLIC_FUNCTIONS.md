# Enable Public Access to Cloud Functions

The Cloud Functions are currently blocking unauthenticated calls. You need to enable public access via the Google Cloud Console.

## Option 1: Via Google Cloud Console (Recommended)

1. **Go to Cloud Functions**
   - Open: https://console.cloud.google.com/functions/list?project=styled-866b7
   - You'll see all 4 functions listed

2. **For EACH function** (`classifyGarmentImage`, `generateImageEmbedding`, `findSimilarItems`, `shopMyCloset`):
   
   a. Click on the function name
   
   b. Click the **"PERMISSIONS"** tab at the top
   
   c. Click **"GRANT ACCESS"** button
   
   d. In the "Add principals" field, enter: `allUsers`
   
   e. In the "Select a role" dropdown, choose: **"Cloud Functions Invoker"**
   
   f. Click **"SAVE"**
   
   g. You'll see a warning about making the function public - click **"ALLOW PUBLIC ACCESS"**

3. **Repeat for all 4 functions**

## Option 2: Via gcloud CLI (If installed)

If you have gcloud CLI installed, run these commands:

```bash
gcloud functions add-iam-policy-binding classifyGarmentImage \
  --region=us-central1 \
  --member=allUsers \
  --role=roles/cloudfunctions.invoker \
  --project=styled-866b7

gcloud functions add-iam-policy-binding generateImageEmbedding \
  --region=us-central1 \
  --member=allUsers \
  --role=roles/cloudfunctions.invoker \
  --project=styled-866b7

gcloud functions add-iam-policy-binding findSimilarItems \
  --region=us-central1 \
  --member=allUsers \
  --role=roles/cloudfunctions.invoker \
  --project=styled-866b7

gcloud functions add-iam-policy-binding shopMyCloset \
  --region=us-central1 \
  --member=allUsers \
  --role=roles/cloudfunctions.invoker \
  --project=styled-866b7
```

## Verification

After enabling public access, try adding a closet item again. You should see:
1. Image uploads to Storage ✅
2. AI classification runs ✅
3. Embedding generation runs ✅
4. Item saves to Firestore ✅

## Security Note

⚠️ **These functions are now publicly accessible!**

This is fine for testing, but before production you should:
1. Enable Firebase Authentication
2. Add auth checks in the functions
3. Remove public access
4. Only allow authenticated users

## Alternative: Use Firebase Auth (Later)

Once you add Firebase Authentication:
1. Users will automatically be authenticated
2. Functions will work without public access
3. Much more secure!

---

**Follow Option 1 above to enable public access, then try adding a closet item again!**
