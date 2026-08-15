import { Router } from 'express';
import { authProvider } from '../middleware/auth.js';
import {
  getSlotsByParking,
  setSlotStatus,
  markMaintenance,
  makeAvailable,
} from '../controllers/slotController.js';
import ParkingSlot from '../models/ParkingSlot.js';

const router = Router();

router.get('/public/:id', async (req, res, next) => {
  try {
    const slots = await ParkingSlot.find({ parking: req.params.id }).sort({ slotNumber: 1 });
    res.json(slots);
  } catch (error) {
    next(error);
  }
});

router.get('/parking/:id', authProvider, getSlotsByParking);
router.post('/status', authProvider, setSlotStatus);
router.post('/:id/maintenance', authProvider, markMaintenance);
router.post('/:id/available', authProvider, makeAvailable);

export default router;