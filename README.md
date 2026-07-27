# Styled - Fashion Outfit Curation Platform

A comprehensive fashion styling app that combines AI-powered outfit recommendations, closet management, and professional styling services.

## Project Structure

```
Styled/
├── styled-app/          # React Native mobile/web app
└── backend/             # Node.js/Express API server
```

## Features

### Phase 0 - Foundation (Current)
- ✅ React Native app with TypeScript
- ✅ Bottom tab navigation (Home/Work/Going Out/Closet/More)
- ✅ Design system with reusable components
- ✅ Backend API with Express and Prisma
- ✅ Database schema for all core models

### Upcoming Phases
- **Phase 1**: Trend palettes and outfit browsing
- **Phase 2**: Closet upload and AI pairing
- **Phase 3**: Professional styling sessions
- **Phase 4**: Subscription tiers and monetization
- **Phase 5**: Growth features (social, notifications)
- **Phase 6**: Advanced features (AR, sustainability)

## Tech Stack

### Frontend
- **Framework**: React Native (Expo)
- **Language**: TypeScript
- **Navigation**: React Navigation
- **Styling**: NativeWind (Tailwind for React Native)
- **State Management**: TBD (Context API or Zustand)

### Backend
- **Runtime**: Node.js
- **Framework**: Express
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT

### Future Integrations
- **AI/ML**: OpenAI Vision, Google Vision, CLIP embeddings
- **Vector DB**: Pinecone/Weaviate/Qdrant
- **Image Processing**: Cloudinary, remove.bg
- **Payments**: Stripe
- **Affiliate**: LTK, ShopStyle, Skimlinks

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Expo CLI (for mobile development)

### Frontend Setup

```bash
cd styled-app
npm install
npm start
```

This will start the Expo development server. You can:
- Press `w` to open in web browser
- Press `a` to open Android emulator
- Press `i` to open iOS simulator (macOS only)
- Scan QR code with Expo Go app on your phone

### Backend Setup

```bash
cd backend
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run Prisma migrations
npm run prisma:migrate

# Start development server
npm run dev
```

The API will be available at `http://localhost:3000`

## Environment Variables

### Frontend (.env in styled-app/)
See `styled-app/.env.example` for required variables.

### Backend (.env in backend/)
See `backend/.env.example` for required variables.

Key variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens
- API keys for affiliate networks, image processing, AI services

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Trend Palettes
- `GET /api/palettes` - Get all active palettes
- `GET /api/palettes/:id` - Get specific palette

### Looks
- `GET /api/looks` - Get looks (filterable by occasion, palette)
- `GET /api/looks/:id` - Get specific look
- `POST /api/looks/:id/favorite` - Toggle favorite

### Closet
- `GET /api/closet` - Get user's closet items
- `POST /api/closet` - Add item to closet
- `PUT /api/closet/:id` - Update closet item
- `DELETE /api/closet/:id` - Delete closet item
- `GET /api/closet/:id/pairings` - Get AI outfit pairings

### Stylists
- `GET /api/stylists` - Get all stylists
- `GET /api/stylists/:id` - Get specific stylist
- `POST /api/stylists/:id/book` - Book styling session
- `GET /api/stylists/sessions/my` - Get user's sessions

## Database Schema

See `backend/prisma/schema.prisma` for the complete database schema including:
- Users and preferences
- Trend palettes and looks
- Items and closet items
- Stylists and sessions
- Price tracking and alerts

## Development Workflow

1. **Frontend changes**: Edit files in `styled-app/src/`, hot reload is enabled
2. **Backend changes**: Edit files in `backend/src/`, nodemon will auto-restart
3. **Database changes**: Update `schema.prisma`, run `npm run prisma:migrate`
4. **New dependencies**: Run `npm install <package>` in respective directory

## Testing

```bash
# Frontend
cd styled-app
npm test

# Backend
cd backend
npm test
```

## Deployment

### Frontend
- **Web**: Deploy to Vercel/Netlify
- **iOS**: Build with EAS Build, submit to App Store
- **Android**: Build with EAS Build, submit to Google Play

### Backend
- Deploy to Railway, Render, or AWS
- Set up PostgreSQL database
- Configure environment variables
- Run migrations

## Contributing

This is a private project. For questions or issues, contact the development team.

## License

Proprietary - All rights reserved
