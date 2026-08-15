import { Router } from 'express';
import { authUser } from '../middleware/auth.js';
import { getMe, updateUserProfile } from '../controllers/authController.js';

const router = Router();

router.get('/me', authUser, getMe);
router.put('/me', authUser, updateUserProfile);

export default router;