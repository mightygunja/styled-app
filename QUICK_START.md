# Quick Start Guide

Get the Styled app running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- PostgreSQL installed and running
- Git (optional)

## Step 1: Install Frontend Dependencies

```bash
cd styled-app
npm install
```

## Step 2: Install Backend Dependencies

```bash
cd ../backend
npm install
```

## Step 3: Set Up Database

### Create PostgreSQL Database

```bash
# macOS/Linux
createdb styled_db

# Windows (in psql)
CREATE DATABASE styled_db;
```

### Configure Environment

```bash
# In backend directory
cp .env.example .env
```

Edit `.env` and set your database URL:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/styled_db"
JWT_SECRET="your-secret-key-here"
```

### Run Migrations

```bash
npm run prisma:migrate
```

## Step 4: Start Backend Server

```bash
npm run dev
```

Backend will run on `http://localhost:3000`

## Step 5: Start Frontend App

Open a new terminal:

```bash
cd styled-app
npm start
```

### Choose Your Platform

- Press `w` - Open in web browser
- Press `a` - Open Android emulator
- Press `i` - Open iOS simulator (macOS only)
- Scan QR code - Open on physical device with Expo Go app

## Verify Everything Works

1. **Backend Health Check**: Visit `http://localhost:3000/health`
   - Should return: `{"status":"ok","timestamp":"..."}`

2. **Frontend**: You should see the app with 5 tabs at the bottom
   - Home, Work, Going Out, Closet, More

## Common Issues

### Port 3000 already in use
```bash
# Change PORT in backend/.env
PORT=3001
```

### Database connection failed
- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL in `.env`
- Check username/password are correct

### Expo won't start
```bash
# Clear cache
npx expo start -c
```

### TypeScript errors
```bash
# Regenerate types
cd backend
npm run prisma:generate
```

## Next Steps

- Read `README.md` for full documentation
- Check `PHASE_0_COMPLETE.md` for what's been built
- Review `backend/prisma/schema.prisma` to understand the data model
- Explore the code in `styled-app/src/` and `backend/src/`

## Development Tips

### Hot Reload
- Frontend: Changes auto-reload in Expo
- Backend: Nodemon auto-restarts on file changes

### Database GUI
```bash
cd backend
npm run prisma:studio
```
Opens a visual database browser at `http://localhost:5555`

### View API Routes
All routes are defined in `backend/src/routes/`

### View App Screens
All screens are in `styled-app/src/screens/`

## Ready to Build!

You're all set! Start with Phase 1 to implement the trend palette and look browsing features.
