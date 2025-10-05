import express from 'express';
import { reviewCode, getReviewHistory } from '../controllers/review-controller.js';

const router = express.Router();

router.post('/review', reviewCode);

router.get('/reviews', getReviewHistory);

export default router;