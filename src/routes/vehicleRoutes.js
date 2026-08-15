import { Router } from 'express';
import { authUser } from '../middleware/auth.js';
import {
  getMyVehicles,
  addVehicle,
  updateVehicle,
  deleteVehicle,
} from '../controllers/vehicleController.js';

const router = Router();

router.use(authUser);

router.get('/', getMyVehicles);
router.post('/', addVehicle);
router.put('/:id', updateVehicle);
router.delete('/:id', deleteVehicle);

export default router;