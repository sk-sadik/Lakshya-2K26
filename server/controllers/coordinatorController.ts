import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Coordinator } from '../models/Coordinator';
import { Event } from '../models/Event';
import { AuthenticatedRequest, AuthUser } from '../middleware/auth';

// Helper to get coordinator entity from either User or Coordinator collection
async function findCoordinatorEntity(userId: any, email?: string) {
  let entity: any = await User.findById(userId);
  if (!entity && email) {
    entity = await User.findOne({ email: email.toLowerCase().trim() });
  }
  if (!entity) {
    entity = await Coordinator.findById(userId);
  }
  return entity;
}

// GET /api/coordinator/profile
export async function getCoordinatorProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const coordinator = await findCoordinatorEntity(req.user._id, req.user.email);
    if (!coordinator) {
      res.status(404).json({ success: false, message: 'Coordinator profile not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      coordinator: coordinator.toJSON(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching coordinator profile.' });
  }
}

// PUT /api/coordinator/profile
export async function updateCoordinatorProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { name, phone, facultyId, designation, department, rollNo, newPassword } = req.body;
    const updates: any = {};

    if (name) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (facultyId !== undefined) updates.facultyId = facultyId.trim();
    if (rollNo !== undefined) updates.rollNo = rollNo.trim();
    if (designation !== undefined) updates.designation = designation.trim();
    if (department !== undefined) updates.department = department.trim();
    if (newPassword && newPassword.trim()) {
      const salt = await bcrypt.genSalt(10);
      updates.passwordHash = await bcrypt.hash(newPassword.trim(), salt);
    }

    let updated = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    if (!updated) {
      updated = await Coordinator.findByIdAndUpdate(req.user._id, updates, { new: true }) as any;
    }

    if (!updated) {
      res.status(404).json({ success: false, message: 'Coordinator account not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      coordinator: updated.toJSON(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error updating profile.' });
  }
}

// GET /api/coordinator/events
export async function getCoordinatorEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const userEmail = (req.user.email || '').toLowerCase().trim();
    const events = await Event.find({
      $or: [
        { coordinator: req.user._id },
        { coordinatorEmail: userEmail },
      ],
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching events.' });
  }
}

// POST /api/coordinator/events
export async function createCoordinatorEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const eventName = req.body.eventName || req.body.title;
    if (!eventName) {
      res.status(400).json({ success: false, message: 'Event title/name is required.' });
      return;
    }

    const entryFee = req.body.entryFee || 'Free';
    const registrationFee = req.body.registrationFee || entryFee || 'Free';
    
    // Parse fee amount
    let feeAmount = 0;
    let isPaid = false;
    if (registrationFee && !registrationFee.toLowerCase().includes('free')) {
      const cleanNum = registrationFee.replace(/[^0-9.]/g, '');
      feeAmount = parseFloat(cleanNum) || 0;
      isPaid = feeAmount > 0;
    }

    const newEvent = await Event.create({
      ...req.body,
      title: eventName,
      eventName,
      entryFee,
      registrationFee,
      feeAmount,
      isPaid,
      coordinator: req.user._id,
      coordinatorName: req.body.coordinatorName || req.user.name,
      coordinatorEmail: req.body.coordinatorEmail || req.user.email.toLowerCase(),
      department: req.body.department || req.user.department || 'cse',
      registeredCount: 0,
    });

    // Update coordinator's events managed in User (or Coordinator)
    await User.findByIdAndUpdate(req.user._id, {
      $push: { eventsManaged: newEvent._id },
    });
    await Coordinator.findByIdAndUpdate(req.user._id, {
      $push: { eventsManaged: newEvent._id },
    });

    res.status(201).json({
      success: true,
      message: 'Event created successfully.',
      event: newEvent,
    });
  } catch (error: any) {
    console.error('[Coordinator Create Event Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create event.' });
  }
}

// GET /api/coordinator/analytics
export async function getCoordinatorAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const userEmail = (req.user.email || '').toLowerCase().trim();
    const events = await Event.find({
      $or: [
        { coordinator: req.user._id },
        { coordinatorEmail: userEmail },
      ],
    });
    const eventIds = events.map(e => e._id);
    const customIds = events.map(e => e.customId).filter(Boolean);

    const { Registration } = await import('../models/Registration');
    const registrations = await Registration.find({
      $or: [
        { event: { $in: eventIds } },
        { eventId: { $in: [...eventIds.map(String), ...customIds] } },
      ],
    });

    const totalRegistrations = registrations.length;
    const confirmedRegistrations = registrations.filter(r => r.registrationStatus === 'CONFIRMED').length;
    const paidRegistrations = registrations.filter(r => r.paymentStatus === 'PAID').length;

    // Calculate total revenue
    const totalRevenue = registrations
      .filter(r => r.paymentStatus === 'PAID')
      .reduce((sum, r) => sum + (r.paymentAmount || 0), 0);

    res.status(200).json({
      success: true,
      analytics: {
        totalEvents: events.length,
        totalRegistrations,
        confirmedRegistrations,
        paidRegistrations,
        totalRevenue: `₹${totalRevenue.toLocaleString()}`,
        totalRevenueAmount: totalRevenue,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching analytics.' });
  }
}
