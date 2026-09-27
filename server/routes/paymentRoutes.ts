import { Router } from 'express';
import { createPaymentOrder, verifyPayment, paymentWebhook } from '../controllers/paymentController';
import { protect } from '../middleware/auth';

const router = Router();

router.post('/create-order', protect, createPaymentOrder);
router.post('/verify', protect, verifyPayment);
router.post('/webhook', paymentWebhook);

export default router;
