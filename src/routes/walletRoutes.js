import { Router } from 'express';
import { authUser, authProvider } from '../middleware/auth.js';
import {
  getMyWallet,
  rechargeWallet,
  getProviderWallet,
  saveBankDetails,
  withdrawWallet,
} from '../controllers/walletController.js';

const router = Router();

router.get('/me', authUser, getMyWallet);
router.post('/recharge', authUser, rechargeWallet);

router.get('/provider', authProvider, getProviderWallet);
router.put('/provider/bank', authProvider, saveBankDetails);
router.post('/provider/withdraw', authProvider, withdrawWallet);

export default router;