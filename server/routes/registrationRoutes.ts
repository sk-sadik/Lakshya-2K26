import { Router } from 'express';
import {
  getMyRegistrations,
  getRegistrationById,
  getRegistrationQR,
  cancelRegistration,
  deleteRegistration,
  checkInAttendee,
} from '../controllers/registrationController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.get('/my', protect, getMyRegistrations);
router.get('/:id', protect, getRegistrationById);
router.get('/:id/qr', protect, getRegistrationQR);
router.put('/:id/cancel', protect, cancelRegistration);
router.delete('/:id', protect, deleteRegistration);

// Turnstile / QR check-in endpoint for coordinators and admins
router.post('/check-in', protect, authorize('coordinator', 'admin'), checkInAttendee);

export default router;
