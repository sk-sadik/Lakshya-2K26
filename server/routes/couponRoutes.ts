import { Router } from 'express';
import {
  generateCoupon,
  getMyCoupons,
  getCouponById,
  redeemCoupon,
  verifyCoupon,
  getAllCoupons,
  generateTokensForEventParticipants,
  sendCouponEmailById,
  sendCouponEmailsToParticipants,
  sendCouponToEmailAdmin,
} from '../controllers/couponController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

// Food coupons are exclusively managed by coordinators and admins (not visible to student users on the site)

// GET /api/coupons (Coordinator/Admin: view all coupons)
router.get('/', protect, authorize('coordinator', 'admin'), getAllCoupons);

// POST /api/coupons/bulk-generate-for-participants (Admin: all events; Coordinator: own events only)
router.post('/bulk-generate-for-participants', protect, authorize('coordinator', 'admin'), generateTokensForEventParticipants);

// POST /api/coupons/generate (Coordinator/Admin: generate a coupon for a participant)
router.post('/generate', protect, authorize('coordinator', 'admin'), generateCoupon);

// POST /api/coupons/send-emails-to-participants (Coordinator/Admin: email ALL issued passes to confirmed event participants)
router.post('/send-emails-to-participants', protect, authorize('coordinator', 'admin'), sendCouponEmailsToParticipants);

// POST /api/coupons/send-to-email (Admin only: generate + email a coupon to any address, regardless of event participation)
router.post('/send-to-email', protect, authorize('admin'), sendCouponToEmailAdmin);

// POST /api/coupons/:id/send-email (Coordinator/Admin: email an existing coupon to the participant)
router.post('/:id/send-email', protect, authorize('coordinator', 'admin'), sendCouponEmailById);

// GET /api/coupons/my (any logged-in user: their own passes, one per event registered)
router.get('/my', protect, getMyCoupons);

// POST /api/coupons/verify (check validity before redemption)
router.post('/verify', protect, authorize('coordinator', 'admin'), verifyCoupon);

// POST /api/coupons/redeem (alternate path with body)
router.post('/redeem', protect, authorize('coordinator', 'admin'), redeemCoupon);

// GET /api/coupons/:id
router.get('/:id', protect, authorize('coordinator', 'admin'), getCouponById);

// POST /api/coupons/:id/redeem
router.post('/:id/redeem', protect, authorize('coordinator', 'admin'), redeemCoupon);

export default router;
