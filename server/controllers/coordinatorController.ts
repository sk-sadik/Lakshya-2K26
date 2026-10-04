import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Coordinator } from '../models/Coordinator';
import { Event } from '../models/Event';
import { Notification } from '../models/Notification';
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

// POST /api/coordinator/announcements
// Coordinator sends an announcement ONLY to students registered for one of their own events.
// One per-student notification is created (targetRole 'event') so no other user can see it.
export async function sendEventAnnouncement(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { eventId, title, message, type } = req.body;
    if (!eventId || !title?.trim() || !message?.trim()) {
      res.status(400).json({ success: false, message: 'Event, title and message are required.' });
      return;
    }

    // Locate event by ObjectId or customId
    let event: any = null;
    if (String(eventId).match(/^[0-9a-fA-F]{24}$/)) {
      event = await Event.findById(eventId);
    }
    if (!event) {
      event = await Event.findOne({ customId: eventId });
    }
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    // Ownership check: coordinator must own the event (admins bypass)
    const roles = (req.user as AuthUser)?.roles || [];
    const isAdmin = roles.includes('admin');
    const userEmail = (req.user.email || '').toLowerCase().trim();
    const ownsEvent =
      String(event.coordinator || '') === String(req.user._id) ||
      (event.coordinatorEmail || '').toLowerCase().trim() === userEmail;
    if (!ownsEvent && !isAdmin) {
      res.status(403).json({ success: false, message: 'You can only send announcements for your own events.' });
      return;
    }

    // Active registrants of this event only
    const { Registration } = await import('../models/Registration');
    const regs = await Registration.find({
      $or: [
        { event: event._id },
        { eventId: event._id.toString() },
        ...(event.customId ? [{ eventId: event.customId }] : []),
      ],
      registrationStatus: { $in: ['CONFIRMED', 'PENDING'] },
    });

    // Unique students only
    const seen = new Set<string>();
    const targets = regs.filter((r: any) => {
      const key = String(r.studentId || r.studentEmail).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (targets.length === 0) {
      res.status(400).json({ success: false, message: 'No registered students found for this event yet.' });
      return;
    }

    const docs = targets.map((r: any) => ({
      userId: String(r.studentId),
      targetRole: 'event',
      title: title.trim(),
      message: `${message.trim()}\n\n— ${event.eventName} • Coordinator: ${req.user?.name || ''}`,
      type: type || 'info',
      read: false,
      senderName: req.user?.name || 'Event Coordinator',
      senderRole: 'coordinator',
      senderEmail: (req.user as AuthUser)?.email,
    }));

    await Notification.insertMany(docs);

    res.status(201).json({
      success: true,
      message: `Announcement sent to ${targets.length} registered student(s) of ${event.eventName}.`,
      count: targets.length,
      eventName: event.eventName,
    });
  } catch (error: any) {
    console.error('[Coordinator Announcement Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to send announcement.' });
  }
}

// GET /api/coordinator/events/:id/recipient-count
// Active (CONFIRMED/PENDING) unique registrants of one owned event.
export async function getEventRecipientCount(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }
    const { id: eventId } = req.params;
    let event: any = null;
    if (String(eventId).match(/^[0-9a-fA-F]{24}$/)) {
      event = await Event.findById(eventId);
    }
    if (!event) {
      event = await Event.findOne({ customId: eventId });
    }
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const roles = (req.user as AuthUser)?.roles || [];
    const isAdmin = roles.includes('admin');
    const userEmail = (req.user.email || '').toLowerCase().trim();
    const ownsEvent =
      String(event.coordinator || '') === String(req.user._id) ||
      (event.coordinatorEmail || '').toLowerCase().trim() === userEmail;
    if (!ownsEvent && !isAdmin) {
      res.status(403).json({ success: false, message: 'Not your event.' });
      return;
    }

    const { Registration } = await import('../models/Registration');
    const regs = await Registration.find({
      $or: [
        { event: event._id },
        { eventId: event._id.toString() },
        ...(event.customId ? [{ eventId: event.customId }] : []),
      ],
      registrationStatus: { $in: ['CONFIRMED', 'PENDING'] },
    });
    const unique = new Set(regs.map((r: any) => String(r.studentId || r.studentEmail).toLowerCase()));

    res.status(200).json({ success: true, count: unique.size, eventName: event.eventName });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching recipient count.' });
  }
}

// GET /api/coordinator/announcements
// History of event announcements sent by this coordinator.
export async function getMyEventAnnouncements(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }
    const userEmail = (req.user.email || '').toLowerCase().trim();
    const announcements = await Notification.find({
      senderRole: 'coordinator',
      senderEmail: userEmail,
      targetRole: 'event',
    })
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json({ success: true, count: announcements.length, announcements });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching announcements.' });
  }
}
