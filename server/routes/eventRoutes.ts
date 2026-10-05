import { Router } from 'express';
import {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../controllers/eventController';
import { registerForEvent } from '../controllers/registrationController';
import { protect, authorize, optionalAuth } from '../middleware/auth';
import { registrationLimiter } from '../middleware/rateLimit';

const router = Router();

router.get('/', optionalAuth, getAllEvents);
router.get('/:id', getEventById);

// Protected mutation routes
router.post('/', protect, authorize('coordinator', 'admin'), createEvent);
router.put('/:id', protect, authorize('coordinator', 'admin'), updateEvent);
router.delete('/:id', protect, authorize('coordinator', 'admin'), deleteEvent);

// Registration endpoint under /api/events/:id/register
router.post('/:id/register', protect, registrationLimiter, registerForEvent);

export default router;
