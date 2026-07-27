import { Router } from 'express';
import {
  getAllLooks,
  getLookById,
  createLook,
  toggleFavorite,
  getFavorites,
} from '../controllers/lookController';

const router = Router();

// GET /api/looks/favorites - Get user's favorites
router.get('/favorites', getFavorites);

// GET /api/looks - Get looks with filters
router.get('/', getAllLooks);

// GET /api/looks/:id - Get specific look
router.get('/:id', getLookById);

// POST /api/looks - Create new look
router.post('/', createLook);

// POST /api/looks/:id/favorite - Toggle favorite
router.post('/:id/favorite', toggleFavorite);

export default router;
