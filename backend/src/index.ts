import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import palettesRouter from './routes/palettes';
import looksRouter from './routes/looks';
import closetRouter from './routes/closet';
import authRouter from './routes/auth';
import stylistsRouter from './routes/stylists';
import uploadRouter from './routes/uploadRoutes';

const app: Express = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
}));
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Root route
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Styled API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      palettes: '/api/palettes',
      looks: '/api/looks',
      closet: '/api/closet',
      stylists: '/api/stylists',
    },
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Logging middleware
app.use((req: Request, res: Response, next: any) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/palettes', palettesRouter);
app.use('/api/looks', looksRouter);
app.use('/api/closet', closetRouter);
app.use('/api/stylists', stylistsRouter);
app.use('/api/upload', uploadRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server - listen on all network interfaces
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📱 Network: http://192.168.68.68:${PORT}`);
});

export default app;
