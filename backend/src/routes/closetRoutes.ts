import express from 'express';
import {
  getClosetItems,
  getClosetItemById,
  createClosetItem,
  updateClosetItem,
  deleteClosetItem,
  markItemWorn,
  getClosetStats,
  findSimilarClosetItems,
  shopMyCloset,
} from '../controllers/closetController';

const router = express.Router();

// Closet item CRUD
router.get('/items', getClosetItems);
router.get('/items/:id', getClosetItemById);
router.get('/items/:id/similar', findSimilarClosetItems); // Must be before generic :id route
router.post('/items', createClosetItem);
router.put('/items/:id', updateClosetItem);
router.delete('/items/:id', deleteClosetItem);

// Item actions
router.post('/items/:id/worn', markItemWorn);

// Statistics
router.get('/stats', getClosetStats);

// Shop My Closet - find closet items similar to a look
router.get('/shop-my-closet/:lookId', shopMyCloset);

export default router;
