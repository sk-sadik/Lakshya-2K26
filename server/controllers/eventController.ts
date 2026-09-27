import { Request, Response } from 'express';
import { Event } from '../models/Event';
import { AuthenticatedRequest, AuthUser } from '../middleware/auth';

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
export async function getAllEvents(req: Request, res: Response): Promise<void> {
  try {
    const { department, category, search, status } = req.query;
    const filter: any = {};

    if (department && department !== 'all') {
      filter.department = department;
    }

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search.toString(), 'i');
      filter.$or = [
        { title: searchRegex },
        { eventName: searchRegex },
        { description: searchRegex },
        { venue: searchRegex },
      ];
    }

    const events = await Event.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: events.length,
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
      coordinatorEmail: req.body.coordinatorEmail || req.user.email,
      department: req.body.department || req.user.department || 'cse',
      registeredCount: 0,
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

    // Check ownership if user is coordinator (admins are exempt)
    const userRoles = (req.user as AuthUser)?.roles || [];
    if (userRoles.includes('coordinator') && !userRoles.includes('admin') && event.coordinator && event.coordinator.toString() !== req.user?._id.toString()) {
      if (event.coordinatorEmail && event.coordinatorEmail.toLowerCase() !== req.user?.email?.toLowerCase()) {
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

    // Check ownership if user is coordinator (admins are exempt)
    const userRoles = (req.user as AuthUser)?.roles || [];
    if (userRoles.includes('coordinator') && !userRoles.includes('admin') && event.coordinator && event.coordinator.toString() !== req.user?._id.toString()) {
      if (event.coordinatorEmail && event.coordinatorEmail.toLowerCase() !== req.user?.email?.toLowerCase()) {
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
