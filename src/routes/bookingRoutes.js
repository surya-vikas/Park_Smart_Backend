import { Router } from 'express';
import { authUser, authProvider, authAny } from '../middleware/auth.js';
import {
  previewBooking,
  confirmBooking,
  getMyBookings,
  getProviderBookings,
  getBookingById,
  cancelBooking,
  checkIn,
  checkOut,
  scanBooking,
} from '../controllers/bookingController.js';

const router = Router();

router.post('/preview', authUser, previewBooking);
router.post('/confirm', authUser, confirmBooking);

router.get('/my', authUser, getMyBookings);
router.get('/provider', authProvider, getProviderBookings);
router.get('/:id', authAny, getBookingById);

router.post('/:id/cancel', authUser, cancelBooking);

router.post('/check-in', authProvider, checkIn);
router.post('/check-out', authProvider, checkOut);
router.post('/scan', authProvider, scanBooking);

export default router;