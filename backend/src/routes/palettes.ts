import { Router } from 'express';
import {
  getAllPalettes,
  getPaletteById,
  createPalette,
  updatePalette,
  deletePalette,
  getCurrentPalettes,
} from '../controllers/paletteController';

const router = Router();

// GET /api/palettes/current - Get current week's palettes
router.get('/current', getCurrentPalettes);

// GET /api/palettes - Get all active trend palettes
router.get('/', getAllPalettes);

// GET /api/palettes/:id - Get specific palette
router.get('/:id', getPaletteById);

// POST /api/palettes - Create new palette (admin only)
router.post('/', createPalette);

// PUT /api/palettes/:id - Update palette
router.put('/:id', updatePalette);

// DELETE /api/palettes/:id - Delete palette
router.delete('/:id', deletePalette);

export default router;
