# Database Setup Instructions

## Step 1: Create Database

Make sure PostgreSQL is running, then create the database:

```bash
# Using psql
createdb styled_db

# Or in psql shell
CREATE DATABASE styled_db;
```

## Step 2: Configure Environment

Make sure your `.env` file has the correct DATABASE_URL:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/styled_db?schema=public"
```

Replace `username` and `password` with your PostgreSQL credentials.

## Step 3: Generate Prisma Client

```bash
npm run prisma:generate
```

This creates the Prisma Client based on your schema.

## Step 4: Run Migrations

```bash
npm run prisma:migrate
```

This will:
- Create all database tables
- Prompt you to name the migration (e.g., "init")

## Step 5: Seed Sample Data

```bash
npm run prisma:seed
```

This will populate your database with:
- 3 trend palettes (Quiet Saffron, Charcoal Denim, Silver Accents)
- 8 sample items (clothing and accessories)
- 3 complete looks (one for each occasion)

## Verify Setup

### Option 1: Prisma Studio
```bash
npm run prisma:studio
```

Opens a visual database browser at `http://localhost:5555`

### Option 2: Test API
Start the server:
```bash
npm run dev
```

Then visit:
- `http://localhost:3000/api/palettes` - Should show 3 palettes
- `http://localhost:3000/api/looks` - Should show 3 looks

## Troubleshooting

### "PrismaClient is unable to run"
```bash
npm run prisma:generate
```

### "Database does not exist"
Make sure you created the database in Step 1

### "Authentication failed"
Check your DATABASE_URL credentials in `.env`

### Reset Database (WARNING: Deletes all data)
```bash
npx prisma migrate reset
```

This will drop the database, recreate it, run migrations, and run seed.
