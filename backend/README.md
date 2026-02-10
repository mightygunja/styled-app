# Styled Backend API

Express.js REST API for the Styled fashion platform.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start development server
npm run dev
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)

## Project Structure

```
backend/
├── src/
│   ├── index.ts              # Main server file
│   ├── routes/               # API route handlers
│   │   ├── auth.ts
│   │   ├── palettes.ts
│   │   ├── looks.ts
│   │   ├── closet.ts
│   │   └── stylists.ts
│   ├── controllers/          # Business logic (TBD)
│   ├── middleware/           # Auth, validation (TBD)
│   ├── services/             # External services (TBD)
│   └── utils/                # Helper functions (TBD)
├── prisma/
│   └── schema.prisma         # Database schema
├── .env.example              # Environment template
└── tsconfig.json             # TypeScript config
```

## Environment Variables

Required variables in `.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/styled_db
PORT=3000
JWT_SECRET=your_secret_key
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006
```

See `.env.example` for all available variables.

## API Documentation

### Health Check
- `GET /health` - Returns server status

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and receive JWT
- `GET /api/auth/me` - Get current user (requires auth)

### Trend Palettes
- `GET /api/palettes` - List all active palettes
- `GET /api/palettes/:id` - Get palette details
- `POST /api/palettes` - Create palette (admin only)

### Looks
- `GET /api/looks?occasion=work&paletteId=xxx` - List looks with filters
- `GET /api/looks/:id` - Get look with items
- `POST /api/looks/:id/favorite` - Toggle favorite (requires auth)

### Closet
- `GET /api/closet` - Get user's closet (requires auth)
- `POST /api/closet` - Add item to closet (requires auth)
- `PUT /api/closet/:id` - Update closet item (requires auth)
- `DELETE /api/closet/:id` - Delete closet item (requires auth)
- `GET /api/closet/:id/pairings` - Get AI pairings (requires auth)

### Stylists
- `GET /api/stylists` - List all stylists
- `GET /api/stylists/:id` - Get stylist details
- `POST /api/stylists/:id/book` - Book session (requires auth)
- `GET /api/stylists/sessions/my` - Get user's sessions (requires auth)

## Database

### Setup PostgreSQL

```bash
# macOS
brew install postgresql
brew services start postgresql

# Windows
# Download from https://www.postgresql.org/download/windows/

# Create database
createdb styled_db
```

### Prisma Commands

```bash
# Generate Prisma Client after schema changes
npm run prisma:generate

# Create and apply migration
npm run prisma:migrate

# Open Prisma Studio (database GUI)
npm run prisma:studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

## Development

### Adding a New Route

1. Create route file in `src/routes/`
2. Import and register in `src/index.ts`
3. Add controller logic in `src/controllers/`
4. Add middleware if needed

### Adding a New Model

1. Update `prisma/schema.prisma`
2. Run `npm run prisma:migrate`
3. Prisma Client will auto-update

### Error Handling

All routes should use try-catch blocks:

```typescript
router.get('/', async (req, res) => {
  try {
    // Your logic here
    res.json({ data: result });
  } catch (error) {
    res.status(500).json({ error: 'Error message' });
  }
});
```

## Testing

```bash
# Run tests (TBD)
npm test

# Run tests in watch mode
npm run test:watch
```

## Deployment

### Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Render

1. Connect GitHub repo
2. Set environment variables
3. Deploy automatically on push

### Environment Variables in Production

Make sure to set all required environment variables in your hosting platform:
- `DATABASE_URL`
- `JWT_SECRET`
- `ALLOWED_ORIGINS`
- API keys for third-party services

## Troubleshooting

### Prisma Client not found
```bash
npm run prisma:generate
```

### Migration errors
```bash
npx prisma migrate reset
npm run prisma:migrate
```

### Port already in use
```bash
# Change PORT in .env or kill process
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill
```

## Next Steps

- [ ] Implement authentication middleware
- [ ] Add input validation
- [ ] Implement actual database queries
- [ ] Add image upload handling
- [ ] Integrate AI services
- [ ] Add rate limiting
- [ ] Set up logging
- [ ] Write tests
