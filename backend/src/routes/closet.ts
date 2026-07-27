import express from 'express';
import {
  getClosetItems,
  getClosetItemById,
  createClosetItem,
  updateClosetItem,
  deleteClosetItem,
  markItemWorn,
  getClosetStats,
} from '../controllers/closetController';

const router = express.Router();

// Closet item CRUD
router.get('/items', getClosetItems);
router.get('/items/:id', getClosetItemById);
router.post('/items', createClosetItem);
router.put('/items/:id', updateClosetItem);
router.delete('/items/:id', deleteClosetItem);

// Item actions
router.post('/items/:id/worn', markItemWorn);

// Statistics
router.get('/stats', getClosetStats);

// AI outfit pairings (placeholder for later)
router.get('/items/:id/pairings', async (req, res) => {
  res.json({
    message: 'AI outfit pairings - to be implemented in Prompt 13',
    data: [],
  });
});

export default router;
