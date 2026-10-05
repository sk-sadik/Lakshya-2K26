import { Router } from 'express';
import {
  register,
  verifyEmail,
  resendOTP,
  login,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  changePassword,
  getMe,
  sendOTP,
  verifyOTP,
} from '../controllers/authController';
import { protect } from '../middleware/auth';
import { authLimiter, otpSendLimiter, otpVerifyLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/verify-email', otpVerifyLimiter, verifyEmail);
router.post('/send-otp', otpSendLimiter, sendOTP);
router.post('/verify-otp', otpVerifyLimiter, verifyOTP);
router.post('/resend-otp', otpSendLimiter, resendOTP);
router.post('/login', authLimiter, login);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/verify-reset-otp', otpVerifyLimiter, verifyResetOTP);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/change-password', protect, changePassword);
router.get('/me', protect, getMe);

export default router;
