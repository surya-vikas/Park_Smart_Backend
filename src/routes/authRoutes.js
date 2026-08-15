import { Router } from 'express';
import {
  requestOtp,
  verifyOtp,
  registerProvider,
  loginProvider,
} from '../controllers/authController.js';

const router = Router();

router.post('/user/request-otp', requestOtp);
router.post('/user/verify-otp', verifyOtp);

router.post('/provider/register', registerProvider);
router.post('/provider/login', loginProvider);

export default router;