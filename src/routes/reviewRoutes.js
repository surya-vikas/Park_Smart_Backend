import { Router } from 'express';
import { authUser } from '../middleware/auth.js';
import {
  getReviewsForParking,
  createReview,
  getMyReviews,
} from '../controllers/reviewController.js';

const router = Router();

router.get('/parking/:id', getReviewsForParking);
router.get('/my', authUser, getMyReviews);
router.post('/', authUser, createReview);

export default router;