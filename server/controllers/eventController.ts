import { Request, Response } from 'express';
import { Event } from '../models/Event';
import { AuthenticatedRequest, AuthUser } from '../middleware/auth';

/** Escape user input before building a RegExp (prevents ReDoS / injection). */
function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** True for admins and coordinators (see full public list); students/public see only open events. */
function seesAllEvents(user: any): boolean {
  const roles: string[] = Array.isArray(user?.roles) ? user.roles : [user?.role].filter(Boolean);
  return roles.includes('admin') || roles.includes('coordinator');
}

function userIsAdmin(user: any): boolean {
  const roles: string[] = Array.isArray(user?.roles) ? user.roles : [user?.role].filter(Boolean);
  return roles.includes('admin');
}

// Helper to parse entry fee number from string like '₹150', '150', or 'Free'
function parseFeeAmount(feeStr?: string): { feeAmount: number; isPaid: boolean } {
  if (!feeStr || feeStr.toLowerCase().includes('free')) {
    return { feeAmount: 0, isPaid: false };
  }
  const cleanNum = feeStr.replace(/[^0-9.]/g, '');
  const amount = parseFloat(cleanNum) || 0;
  return { feeAmount: amount, isPaid: amount > 0 };
}

// Helper to parse registration fee (for coordinators)
function parseRegistrationFee(feeStr?: string): { registrationFee: string; feeAmount: number; isPaid: boolean } {
  if (!feeStr || feeStr.toLowerCase().includes('free')) {
    return { registrationFee: 'Free', feeAmount: 0, isPaid: false };
  }
  const cleanNum = feeStr.replace(/[^0-9.]/g, '');
  const amount = parseFloat(cleanNum) || 0;
  return { registrationFee: feeStr, feeAmount: amount, isPaid: amount > 0 };
}

// GET /api/events
export async function getAllEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { department, category, search, status, page, limit } = req.query;
    const filter: any = {};

    // Public visibility: students and anonymous callers only see approved,
    // currently-open events. Coordinators/admins see everything they manage.
    if (!seesAllEvents(req.user)) {
      filter.approvalStatus = 'approved';
      filter.status = { $in: ['upcoming', 'ongoing'] };
    } else if (status && status !== 'all') {
      filter.status = status;
    }

    if (department && department !== 'all') {
      filter.department = department;
    }

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (typeof search === 'string' && search.trim()) {
      const term = search.trim().slice(0, 100);
      const searchRegex = new RegExp(escapeRegExp(term), 'i');
      filter.$or = [
        { title: searchRegex },
        { eventName: searchRegex },
        { description: searchRegex },
        { venue: searchRegex },
      ];
    }

    // Bounded pagination: default 50, hard cap 100.
    const pageNum = Math.max(parseInt(String(page || '1'), 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(String(limit || '50'), 10) || 50, 1), 100);

    const total = await Event.countDocuments(filter);
    const events = await Event.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize);

    res.status(200).json({
      success: true,
      count: events.length,
      total,
      page: pageNum,
      limit: pageSize,
      events,
    });
  } catch (error: any) {
    console.error('[Get Events Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch events.' });
  }
}

// GET /api/events/:id
export async function getEventById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    let event = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      event = await Event.findById(id);
    }

    if (!event) {
      event = await Event.findOne({ customId: id });
    }

    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      event,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching event.' });
  }
}

// POST /api/events (Coordinator or Admin)
export async function createEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
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
    const { feeAmount, isPaid } = parseFeeAmount(registrationFee);

    console.log('[Create Event] Request body:', req.body);
    console.log('[Create Event] User:', req.user);

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
      // Coordinators cannot file events under someone else's email (ownership
      // checks trust this field); admins may set it explicitly.
      coordinatorEmail: userIsAdmin(req.user)
        ? (req.body.coordinatorEmail || req.user.email || '').toLowerCase()
        : (req.user.email || '').toLowerCase(),
      department: req.body.department || req.user.department || 'cse',
      registeredCount: 0,
      // Coordinators cannot self-approve or pre-seed counts; admins use the
      // dedicated approval flow. New coordinator events start pending review.
      approvalStatus: userIsAdmin(req.user) ? req.body.approvalStatus || 'approved' : 'pending',
    });

    console.log('[Create Event] Created event:', newEvent);

    res.status(201).json({
      success: true,
      message: 'Event created successfully.',
      event: newEvent,
    });
  } catch (error: any) {
    console.error('[Create Event Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create event.' });
  }
}

// PUT /api/events/:id (Coordinator or Admin)
export async function updateEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    let event = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      event = await Event.findById(id);
    }
    if (!event) {
      event = await Event.findOne({ customId: id });
    }

    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    // Check ownership if user is coordinator (admins are exempt).
    // Events with no owner on record are admin-only.
    const userRoles = (req.user as AuthUser)?.roles || [];
    if (!userRoles.includes('admin')) {
      const idMatch = event.coordinator && event.coordinator.toString() === req.user?._id.toString();
      const emailMatch =
        event.coordinatorEmail &&
        event.coordinatorEmail.toLowerCase() === req.user?.email?.toLowerCase();
      if (!idMatch && !emailMatch) {
        res.status(403).json({ success: false, message: 'Forbidden. You can only update events you coordinate.' });
        return;
      }
    }

    if (req.body.entryFee) {
      const { feeAmount, isPaid } = parseFeeAmount(req.body.entryFee);
      req.body.feeAmount = feeAmount;
      req.body.isPaid = isPaid;
    }

    if (req.body.registrationFee) {
      const { registrationFee: parsedRegFee, feeAmount, isPaid } = parseRegistrationFee(req.body.registrationFee);
      req.body.registrationFee = parsedRegFee;
      req.body.feeAmount = feeAmount;
      req.body.isPaid = isPaid;
    }

    if (req.body.title || req.body.eventName) {
      req.body.title = req.body.title || req.body.eventName;
      req.body.eventName = req.body.title;
    }

    // Mass-assignment guard: coordinators cannot reassign ownership, rewrite
    // seat counts, spoof the coordinator email, or self-approve rejections.
    if (!userIsAdmin(req.user)) {
      delete req.body.registeredCount;
      delete req.body.coordinator;
      delete req.body.coordinatorEmail;
      delete req.body.approvalStatus;
    }

    const updated = await Event.findByIdAndUpdate(event._id, req.body, { new: true });

    res.status(200).json({
      success: true,
      message: 'Event updated successfully.',
      event: updated,
    });
  } catch (error: any) {
    console.error('[Update Event Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update event.' });
  }
}

// DELETE /api/events/:id (Coordinator or Admin)
export async function deleteEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    let event = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      event = await Event.findById(id);
    }
    if (!event) {
      event = await Event.findOne({ customId: id });
    }

    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    // Check ownership if user is coordinator (admins are exempt).
    // Events with no owner on record are admin-only.
    const userRoles = (req.user as AuthUser)?.roles || [];
    if (!userRoles.includes('admin')) {
      const idMatch = event.coordinator && event.coordinator.toString() === req.user?._id.toString();
      const emailMatch =
        event.coordinatorEmail &&
        event.coordinatorEmail.toLowerCase() === req.user?.email?.toLowerCase();
      if (!idMatch && !emailMatch) {
        res.status(403).json({ success: false, message: 'Forbidden. You can only delete events you coordinate.' });
        return;
      }
    }

    await Event.findByIdAndDelete(event._id);

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully.',
    });
  } catch (error: any) {
    console.error('[Delete Event Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete event.' });
  }
}
