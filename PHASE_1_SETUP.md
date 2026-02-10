# Phase 1: Browse Tier - Setup Instructions

## What's Been Built

### Backend
- ✅ Palette Controller with full CRUD operations
- ✅ Look Controller with filtering and favorites
- ✅ Updated API routes for palettes and looks
- ✅ Database seed script with sample data
- ✅ 3 trend palettes (Quiet Saffron, Charcoal Denim, Silver Accents)
- ✅ 8 sample items (clothing and accessories)
- ✅ 3 complete looks (one for each occasion)

### Frontend
- ✅ API service layer for backend communication
- ✅ LookCard component with favorite functionality
- ✅ Updated HomeScreen with real data fetching
- ✅ Loading states and pull-to-refresh

## Setup Steps

### 1. Generate Prisma Client

In the `backend` directory:

```bash
cd backend
npm run prisma:generate
```

This will create the Prisma Client and resolve all the TypeScript errors.

### 2. Run Database Migrations

```bash
npm run prisma:migrate
```

When prompted for a migration name, enter: `phase1_init`

This creates all the database tables.

### 3. Seed Sample Data

```bash
npm run prisma:seed
```

This populates your database with:
- 3 trend palettes
- 8 fashion items
- 3 complete looks

### 4. Start Backend Server

```bash
npm run dev
```

Server will run on `http://localhost:3000`

### 5. Test API Endpoints

Open your browser or use curl:

```bash
# Get all palettes
curl http://localhost:3000/api/palettes

# Get current week's palettes
curl http://localhost:3000/api/palettes/current

# Get all looks
curl http://localhost:3000/api/looks

# Get home looks only
curl http://localhost:3000/api/looks?occasion=home
```

### 6. Start Frontend App

In a new terminal, navigate to `styled-app`:

```bash
cd styled-app
npm start
```

Press `w` to open in web browser.

## Verify Everything Works

### Backend Verification
1. Visit `http://localhost:3000/api/palettes` - Should return 3 palettes
2. Visit `http://localhost:3000/api/looks` - Should return 3 looks
3. Open Prisma Studio: `npm run prisma:studio` - Browse your data visually

### Frontend Verification
1. Open the app in your browser
2. Navigate to the "Home" tab
3. You should see the "Cozy Weekend Vibes" look card
4. Try clicking the heart icon to favorite it
5. Pull down to refresh the list

## What's Working

### API Endpoints

**Palettes:**
- `GET /api/palettes` - Get all palettes
- `GET /api/palettes/current` - Get current week's palettes
- `GET /api/palettes/:id` - Get specific palette with looks
- `POST /api/palettes` - Create new palette
- `PUT /api/palettes/:id` - Update palette
- `DELETE /api/palettes/:id` - Delete palette

**Looks:**
- `GET /api/looks` - Get all looks (filterable by occasion)
- `GET /api/looks/:id` - Get specific look with items
- `POST /api/looks` - Create new look
- `POST /api/looks/:id/favorite` - Toggle favorite
- `GET /api/looks/favorites?userId=xxx` - Get user's favorites

### Frontend Features
- Look cards with images
- Favorite/unfavorite functionality
- Pull-to-refresh
- Loading states
- Responsive card layout
- Sponsored badges
- Tags display

## Next Steps for Phase 1

Still to implement:

### 1. Update Work & Going Out Screens
Copy the HomeScreen pattern to WorkScreen and GoingOutScreen, changing the occasion filter.

### 2. Look Detail Screen
Create a detailed view showing:
- Full outfit image
- All items with prices
- "Shop This Look" buttons
- Swap alternatives

### 3. Filter System
Add filtering UI for:
- Price range
- Colors
- Body types
- Lifestyle filters

### 4. Affiliate Link Integration
- Set up LTK/ShopStyle accounts
- Add affiliate parameters to links
- Track click events

### 5. Search Functionality
- Add search bar
- Implement autocomplete
- Search by color, style, brand

## Troubleshooting

### "PrismaClient is unable to run"
```bash
cd backend
npm run prisma:generate
```

### "Cannot find module '@prisma/client'"
```bash
cd backend
npm install
npm run prisma:generate
```

### API returns empty arrays
```bash
cd backend
npm run prisma:seed
```

### Frontend can't connect to backend
1. Make sure backend is running on port 3000
2. Check `styled-app/src/constants/index.ts` - API_CONFIG.BASE_URL should be `http://localhost:3000/api`
3. For mobile devices, you may need to use your computer's IP address instead of localhost

### Images not loading
The seed script uses Unsplash placeholder images. If they don't load, the LookCard will show a fallback placeholder.

## Sample Data Overview

### Palettes
1. **Quiet Saffron** (Home) - Warm, earthy tones
2. **Charcoal Denim** (Work) - Professional blues and grays
3. **Silver Accents** (Going Out) - Metallic and neutral tones

### Looks
1. **Cozy Weekend Vibes** (Home) - Oversized sweater + lounge pants
2. **Power Professional** (Work) - Blazer + button-down + trousers
3. **Night Out Glamour** (Going Out) - Sequin dress + heels + clutch

## Development Tips

### Adding More Sample Data
Edit `backend/prisma/seed.ts` and run:
```bash
npm run prisma:seed
```

### Resetting Database
```bash
npx prisma migrate reset
```
This drops the database, recreates it, runs migrations, and seeds data.

### Viewing Database
```bash
npm run prisma:studio
```
Opens a visual database browser at `http://localhost:5555`

## Ready to Continue!

Your Phase 1 foundation is complete. You can now:
1. Browse looks by occasion
2. Favorite/unfavorite looks
3. See real data from the database
4. Test the full stack integration

Continue building the remaining Phase 1 features! 🚀
