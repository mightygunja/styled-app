# Quick Command Reference

## Backend Commands

```bash
# Navigate to backend
cd backend

# Generate Prisma Client (run this first!)
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database with sample data
npm run prisma:seed

# Start development server
npm run dev

# Open Prisma Studio (database GUI)
npm run prisma:studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

## Frontend Commands

```bash
# Navigate to frontend
cd styled-app

# Start Expo development server
npm start

# Then press:
# w - Open in web browser
# a - Open Android emulator
# i - Open iOS simulator
# r - Reload app
# c - Clear cache and reload

# Install web dependencies (if needed)
npx expo install react-dom react-native-web
```

## Full Setup (First Time)

```bash
# Backend
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev

# In a new terminal - Frontend
cd styled-app
npm install
npm start
```

## Testing API

```bash
# Get all palettes
curl http://localhost:3000/api/palettes

# Get all looks
curl http://localhost:3000/api/looks

# Get home looks only
curl http://localhost:3000/api/looks?occasion=home

# Get work looks only
curl http://localhost:3000/api/looks?occasion=work

# Get going-out looks only
curl http://localhost:3000/api/looks?occasion=going-out
```

## Common Issues

### Prisma Client not found
```bash
cd backend
npm run prisma:generate
```

### Port 3000 already in use
```bash
# Kill the process
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill
```

### Database connection error
Check your `.env` file in the backend directory:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/styled_db"
```

### Expo cache issues
```bash
cd styled-app
npx expo start -c
```
