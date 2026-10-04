import express from 'express';
import { protect, authorize } from '../middleware/auth';
import {
  getCoordinatorProfile,
  updateCoordinatorProfile,
  getCoordinatorEvents,
  createCoordinatorEvent,
  getCoordinatorAnalytics,
  sendEventAnnouncement,
  getMyEventAnnouncements,
  getEventRecipientCount,
} from '../controllers/coordinatorController';

const router = express.Router();

// All coordinator routes require authentication and coordinator role
router.use(protect);
router.use(authorize('coordinator', 'admin'));

// Profile routes
router.get('/profile', getCoordinatorProfile);
router.put('/profile', updateCoordinatorProfile);

// Event management routes
router.get('/events', getCoordinatorEvents);
router.post('/events', createCoordinatorEvent);

// Analytics route
router.get('/analytics', getCoordinatorAnalytics);

// Event announcements: coordinator -> ONLY students registered for their own event
router.post('/announcements', sendEventAnnouncement);
router.get('/announcements', getMyEventAnnouncements);
router.get('/events/:id/recipient-count', getEventRecipientCount);

export default router;
