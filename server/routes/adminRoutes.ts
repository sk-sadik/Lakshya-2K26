import { Router } from 'express';
import {
  getAllUsers,
  addUserAdmin,
  updateUserAdmin,
  deleteUserAdmin,
  getAllRegistrationsAdmin,
  getSystemAnalytics,
  getNotifications,
  sendNotification,
  deleteNotification,
  getSupportReports,
  createSupportReport,
  updateSupportReport,
  deleteSupportReport,
} from '../controllers/adminController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

// User management (Admin only)
router.get('/users', protect, authorize('admin'), getAllUsers);
router.post('/users', protect, authorize('admin'), addUserAdmin);
router.put('/users/:id', protect, authorize('admin'), updateUserAdmin);
router.delete('/users/:id', protect, authorize('admin'), deleteUserAdmin);

// Registrations overview (Coordinator & Admin)
router.get('/registrations', protect, authorize('coordinator', 'admin'), getAllRegistrationsAdmin);

// Analytics
router.get('/analytics', protect, authorize('coordinator', 'admin'), getSystemAnalytics);

// Notifications
router.get('/notifications', protect, getNotifications);
router.post('/notifications', protect, authorize('coordinator', 'admin'), sendNotification);
router.delete('/notifications/:id', protect, authorize('admin'), deleteNotification);

// Support reports
router.get('/reports', protect, getSupportReports);
router.post('/reports', protect, createSupportReport);
router.put('/reports/:id', protect, authorize('admin'), updateSupportReport);
router.delete('/reports/:id', protect, authorize('admin'), deleteSupportReport);

export default router;
