# Cloudinary Setup Guide

## Get Your Cloudinary Credentials

1. Go to https://cloudinary.com/users/register_free
2. Sign up for a free account
3. After logging in, go to your Dashboard
4. You'll see your credentials:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

## Add Credentials to .env

Open `backend/.env` and update these lines:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

## Restart Backend

```bash
cd backend
npm run dev
```

## How It Works

When a user uploads a closet item:

1. **Frontend**: Converts image to base64
2. **Backend**: Receives base64 image
3. **Cloudinary**: Uploads image to cloud storage
   - Creates optimized version (max 1000x1333)
   - Creates thumbnail (300x400)
   - Returns public URLs
4. **OpenAI**: Analyzes the cloud-hosted image
5. **Database**: Saves cloud URLs and AI-detected attributes

## Free Tier Limits

- 25 GB storage
- 25 GB bandwidth/month
- 25,000 transformations/month

This is plenty for development and early production!

## Benefits

✅ Images accessible from anywhere
✅ Automatic optimization
✅ CDN delivery (fast loading)
✅ Thumbnail generation
✅ Works with AI classification
