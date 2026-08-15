import { Router } from 'express';
import { authProvider } from '../middleware/auth.js';
import { getProviderMe, updateProviderProfile } from '../controllers/authController.js';

const router = Router();

router.get('/me', authProvider, getProviderMe);
router.put('/me', authProvider, updateProviderProfile);

export default router;