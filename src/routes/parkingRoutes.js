import { Router } from 'express';
import {
  searchParking,
  getParkingById,
  createParking,
  getMyParking,
  updateParking,
  deleteParking,
  getProviderStats,
} from '../controllers/parkingController.js';
import { authProvider } from '../middleware/auth.js';

const router = Router();

router.get('/search', searchParking);
router.get('/stats', authProvider, getProviderStats);
router.get('/my', authProvider, getMyParking);

router.get('/:id', getParkingById);

router.post('/', authProvider, createParking);
router.put('/:id', authProvider, updateParking);
router.delete('/:id', authProvider, deleteParking);

export default router;