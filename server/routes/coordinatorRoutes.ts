import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getCoordinatorProfile,
  updateCoordinatorProfile,
  getCoordinatorEvents,
  createCoordinatorEvent,
  getCoordinatorAnalytics,
} from '../controllers/coordinatorController';

const router = express.Router();

// All coordinator routes require authentication and coordinator role
router.use(authenticate);
router.use(authorize('coordinator', 'admin'));

// Profile routes
router.get('/profile', getCoordinatorProfile);
router.put('/profile', updateCoordinatorProfile);

// Event management routes
router.get('/events', getCoordinatorEvents);
router.post('/events', createCoordinatorEvent);

// Analytics route
router.get('/analytics', getCoordinatorAnalytics);

export default router;
