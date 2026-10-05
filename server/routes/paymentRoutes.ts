import { Router } from 'express';
import { createPaymentOrder, verifyPayment, paymentWebhook } from '../controllers/paymentController';
import { protect } from '../middleware/auth';
import { paymentLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/create-order', protect, paymentLimiter, createPaymentOrder);
router.post('/verify', protect, paymentLimiter, verifyPayment);
router.post('/webhook', paymentWebhook);

export default router;
