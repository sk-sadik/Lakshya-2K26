import { Response } from 'express';
import { Registration } from '../models/Registration';
import { Event } from '../models/Event';
import { User } from '../models/User';
import { generateRegistrationQR } from '../services/qrService';
import { AuthenticatedRequest, AuthUser } from '../middleware/auth';
import { issueRazorpayOrder } from './paymentController';

/** Max team size parsed from labels like "2 - 4 Members" (capped, sane default). */
function parseMaxTeamSize(teamSize?: string): number {
  const nums = (teamSize || '').match(/\d+/g)?.map(Number) || [];
  if (nums.length === 0) return 4;
  return Math.min(Math.max(Math.max(...nums), 1), 10);
}

/**
 * Resource-level read access for one registration.
 * Student: own only. Coordinator: own events only. Admin: all.
 */
async function canViewRegistration(reg: any, user: any): Promise<boolean> {
  if (!user) return false;
  const roles: string[] = Array.isArray(user.roles) ? user.roles : [user.role].filter(Boolean);
  if (roles.includes('admin')) return true;
  if (String(reg.studentId) === String(user._id)) return true;
  if (roles.includes('coordinator')) {
    const userEmail = (user.email || '').toLowerCase().trim();
    let event: any = null;
    try {
      event = await Event.findById(reg.event);
    } catch {
      event = null;
    }
    if (
      event &&
      (String(event.coordinator || '') === String(user._id) ||
        (event.coordinatorEmail || '').toLowerCase().trim() === userEmail)
    ) {
      return true;
    }
  }
  return false;
}

// POST /api/events/:id/register
export async function registerForEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id: eventId } = req.params;
    const { teamMembers } = req.body;

    // 1. Identity ALWAYS comes from the authenticated JWT user, never the body.
    // The route is protected, so req.user is set; body identity fields are ignored.
    const studentUser = req.user;
    if (!studentUser) {
      res.status(401).json({ success: false, message: 'Please log in to register for symposium events.' });
      return;
    }

    const regStudentName = studentUser.name;
    const regStudentEmail = studentUser.email.toLowerCase().trim();
    const regStudentPhone = (studentUser.phone || '').toString().trim();
    const regCollege = studentUser.college;
    const regDepartment = studentUser.department;

    // Roll number is mandatory; backfill the profile when the user supplies it once.
    let regStudentRollNo = ((studentUser as any).rollNo || '').toString().trim().toUpperCase();
    const bodyRollNo = (req.body?.studentRollNo || '').toString().trim().toUpperCase();
    if (!regStudentRollNo) {
      if (!bodyRollNo) {
        res.status(400).json({ success: false, message: 'Roll number is required. Please update your profile first.' });
        return;
      }
      regStudentRollNo = bodyRollNo;
      try {
        await User.findByIdAndUpdate(studentUser._id, { rollNo: regStudentRollNo });
        (studentUser as any).rollNo = regStudentRollNo;
      } catch {
        // Non-fatal: registration still proceeds with the supplied roll number.
      }
    }
    if (!regStudentPhone) {
      const bodyPhone = (req.body?.studentPhone || '').toString().trim();
      if (bodyPhone) {
        try {
          await User.findByIdAndUpdate(studentUser._id, { phone: bodyPhone });
        } catch {
          // Non-fatal.
        }
      }
    }
    const finalPhone = regStudentPhone || (req.body?.studentPhone || '').toString().trim();

    // 2. Locate Target Event
    let event = null;
    if (eventId.match(/^[0-9a-fA-F]{24}$/)) {
      event = await Event.findById(eventId);
    }
    if (!event) {
      event = await Event.findOne({ customId: eventId });
    }

    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    // 3. Server-side eligibility: approved, open, not cancelled/completed, deadline, capacity.
    if (event.approvalStatus !== 'approved') {
      res.status(400).json({ success: false, message: 'This event is not open for registrations.' });
      return;
    }
    if (event.status === 'cancelled') {
      res.status(400).json({ success: false, message: 'This event has been cancelled and cannot accept registrations.' });
      return;
    }
    if (event.status === 'completed') {
      res.status(400).json({ success: false, message: 'This event has already completed and cannot accept registrations.' });
      return;
    }
    if (!['upcoming', 'ongoing'].includes(event.status)) {
      res.status(400).json({ success: false, message: 'This event is not currently open for registrations.' });
      return;
    }

    if (event.registrationDeadline) {
      const deadline = new Date(event.registrationDeadline);
      if (!isNaN(deadline.getTime()) && new Date() > deadline) {
        res.status(400).json({ success: false, message: 'The registration deadline for this event has passed.' });
        return;
      }
    }

    if (event.maxParticipants > 0 && event.registeredCount >= event.maxParticipants) {
      res.status(400).json({ success: false, message: 'Event capacity is full. Registrations are closed.' });
      return;
    }

    // 4. Validate team members (free-text "Name (ROLL), ..." entries).
    const maxTeam = parseMaxTeamSize(event.teamSize);
    let teamMembersStr: string | undefined;
    if (typeof teamMembers === 'string' && teamMembers.trim()) {
      const entries = teamMembers.split(',').map((s) => s.trim()).filter(Boolean);
      if (entries.length > Math.max(maxTeam - 1, 0)) {
        res.status(400).json({ success: false, message: `Too many team members. This event allows at most ${maxTeam} members including you.` });
        return;
      }
      const seenRolls = new Set<string>([regStudentRollNo]);
      const cleaned: string[] = [];
      for (const entry of entries) {
        if (entry.length > 120) {
          res.status(400).json({ success: false, message: 'Each team member entry must be under 120 characters.' });
          return;
        }
        const sanitized = entry.replace(/[\u0000-\u001F\u007F]/g, '');
        const m = sanitized.match(/^(.*?)\s*\(([A-Za-z0-9\-\/]{3,20})\)\s*$/);
        if (!m) {
          res.status(400).json({ success: false, message: 'Team members must be in the format "Full Name (ROLLNO)".' });
          return;
        }
        const tName = m[1].trim();
        const tRoll = m[2].toUpperCase();
        if (!tName || tName.length > 80) {
          res.status(400).json({ success: false, message: 'Each team member needs a valid name (max 80 characters).' });
          return;
        }
        if (seenRolls.has(tRoll)) {
          res.status(400).json({ success: false, message: 'Duplicate team member roll number (or your own) is not allowed.' });
          return;
        }
        seenRolls.add(tRoll);
        cleaned.push(`${tName} (${tRoll})`);
      }
      teamMembersStr = cleaned.join(', ') || undefined;
    } else if (teamMembers !== undefined && teamMembers !== null && teamMembers !== '') {
      res.status(400).json({ success: false, message: 'Team members must be provided as text.' });
      return;
    }

    // 5. Prevent Duplicate Registration
    const existingActiveReg = await Registration.findOne({
      $or: [
        { student: studentUser._id, event: event._id },
        { studentEmail: studentUser.email.toLowerCase(), eventId: event._id.toString() },
        { studentEmail: studentUser.email.toLowerCase(), eventId: event.customId || event._id.toString() },
      ],
      registrationStatus: { $in: ['CONFIRMED', 'PENDING'] },
    });

    if (existingActiveReg) {
      if (existingActiveReg.registrationStatus === 'CONFIRMED') {
        res.status(409).json({
          success: false,
          message: `You are already registered for ${event.eventName}! View your pass in the dashboard.`,
          registration: existingActiveReg.toJSON(),
        });
        return;
      } else if (existingActiveReg.registrationStatus === 'PENDING' && event.isPaid) {
        // Allow resuming existing pending registration payment
        res.status(200).json({
          success: true,
          message: 'You have a pending registration. Please complete the payment.',
          isPaid: true,
          registration: existingActiveReg.toJSON(),
        });
        return;
      }
    }

    // NOTE: regStudentName/Email/Phone/College/Department/RollNo are defined
    // once above from the JWT identity (never from the request body).

    // 6. Check Fee and Route accordingly
    if (!event.isPaid || event.feeAmount <= 0) {
      // Concurrency protection: atomically check and reserve participant count
      if (event.maxParticipants && event.maxParticipants > 0) {
        const capacityCheck = await Event.findOneAndUpdate(
          {
            _id: event._id,
            registeredCount: { $lt: event.maxParticipants },
          },
          { $inc: { registeredCount: 1 } },
          { new: true }
        );

        if (!capacityCheck) {
          res.status(400).json({ success: false, message: 'Event capacity is full. Registrations are closed.' });
          return;
        }
      } else {
        await Event.findByIdAndUpdate(event._id, { $inc: { registeredCount: 1 } });
      }

      // FREE EVENT: Instant Confirmation + QR Generation
      try {
        const newReg = new Registration({
          student: studentUser._id,
          studentId: studentUser._id.toString(),
          studentName: regStudentName,
          studentEmail: regStudentEmail,
          studentPhone: regStudentPhone,
          studentRollNo: regStudentRollNo,
          event: event._id,
          eventId: event._id.toString(),
          eventName: event.eventName,
          college: regCollege,
          department: regDepartment,
          teamMembers: teamMembersStr,
          paymentAmount: 0,
          paymentStatus: 'FREE',
          registrationStatus: 'CONFIRMED',
        });

        const qr = await generateRegistrationQR(newReg._id.toString(), event._id.toString(), studentUser._id.toString());
        newReg.qrToken = qr.token;
        newReg.qrCodeDataUrl = qr.dataUrl;

        await newReg.save();

        res.status(201).json({
          success: true,
          message: `Successfully registered for ${event.eventName}! Your registration QR pass is ready.`,
          isPaid: false,
          registration: newReg.toJSON(),
          qrToken: qr.token,
          qrCodeDataUrl: qr.dataUrl,
        });
        return;
      } catch (saveErr: any) {
        // Rollback capacity reservation on error
        await Event.findByIdAndUpdate(event._id, { $inc: { registeredCount: -1 } });
        throw saveErr;
      }
    } else {
      // PAID EVENT: Create Pending Registration first, then issue a REAL order.
      const newReg = await Registration.create({
        student: studentUser._id,
        studentId: studentUser._id.toString(),
        studentName: regStudentName,
        studentEmail: regStudentEmail,
        studentPhone: regStudentPhone,
        studentRollNo: regStudentRollNo,
        event: event._id,
        eventId: event._id.toString(),
        eventName: event.eventName,
        college: regCollege,
        department: regDepartment,
        teamMembers: teamMembersStr,
        paymentAmount: event.feeAmount,
        paymentStatus: 'PENDING',
        registrationStatus: 'PENDING',
      });

      // Strict order issuance: never a fake order id. On gateway failure the
      // PENDING registration is kept so payment can be retried from the dashboard.
      try {
        const order = await issueRazorpayOrder(newReg, event);
        newReg.paymentOrderId = order.id;
        await newReg.save();

        res.status(201).json({
          success: true,
          message: 'Registration initiated. Please complete payment to confirm your spot and generate your pass.',
          isPaid: true,
          registration: newReg.toJSON(),
          paymentOrder: {
            id: order.id,
            amount: order.amount,
            currency: order.currency,
            key: order.key,
            eventName: event.eventName,
            entryFee: event.entryFee,
            studentName: regStudentName,
            studentEmail: regStudentEmail,
            studentPhone: regStudentPhone,
          },
        });
      } catch (orderErr: any) {
        res.status(201).json({
          success: true,
          message: 'Registration saved as pending, but the payment order could not be created. Please complete payment from your dashboard.',
          isPaid: true,
          registration: newReg.toJSON(),
          paymentOrder: null,
          orderError: orderErr?.message || 'Payment gateway is temporarily unavailable.',
        });
      }
    }
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        message: 'You already have an active registration for this event.',
      });
      return;
    }
    console.error('[Register For Event Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to register for event.' });
  }
}

// GET /api/registrations/my
export async function getMyRegistrations(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const registrations = await Registration.find({
      $or: [
        { student: req.user._id },
        { studentId: req.user._id.toString() },
        { studentEmail: req.user.email.toLowerCase() },
      ],
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: registrations.length,
      registrations,
    });
  } catch (error: any) {
    console.error('[Get My Registrations Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch registrations.' });
  }
}

// GET /api/registrations/:id
// Students: own registrations only. Coordinators: registrations of events they
// own. Admins: all. Unknown/forbidden ids uniformly return 404 (no oracle).
export async function getRegistrationById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!String(id).match(/^[0-9a-fA-F]{24}$/)) {
      res.status(404).json({ success: false, message: 'Registration not found.' });
      return;
    }
    const reg = await Registration.findById(id);

    if (!reg) {
      res.status(404).json({ success: false, message: 'Registration not found.' });
      return;
    }

    if (!(await canViewRegistration(reg, req.user))) {
      res.status(404).json({ success: false, message: 'Registration not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      registration: reg.toJSON(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching registration.' });
  }
}

// GET /api/registrations/:id/qr
export async function getRegistrationQR(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const reg = await Registration.findById(id);

    if (!reg) {
      res.status(404).json({ success: false, message: 'Registration record not found.' });
      return;
    }

    if (!(await canViewRegistration(reg, req.user))) {
      res.status(404).json({ success: false, message: 'Registration record not found.' });
      return;
    }

    if (reg.registrationStatus !== 'CONFIRMED') {
      res.status(403).json({
        success: false,
        message: 'QR badge is only generated and accessible for confirmed registrations.',
      });
      return;
    }

    // If QR code is not cached on doc, generate it
    if (!reg.qrCodeDataUrl || !reg.qrToken) {
      const qr = await generateRegistrationQR(reg._id.toString(), reg.eventId, reg.studentId);
      reg.qrToken = qr.token;
      reg.qrCodeDataUrl = qr.dataUrl;
      await reg.save();
    }

    res.status(200).json({
      success: true,
      qrToken: reg.qrToken,
      qrCodeDataUrl: reg.qrCodeDataUrl,
      eventName: reg.eventName,
      studentName: reg.studentName,
      status: reg.registrationStatus,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching QR badge.' });
  }
}

// PUT /api/registrations/:id/cancel
export async function cancelRegistration(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const reg = await Registration.findById(id);

    if (!reg) {
      res.status(404).json({ success: false, message: 'Registration not found.' });
      return;
    }

    // Verify ownership or coordinator/admin privilege
    const userRoles = (req.user as AuthUser)?.roles || [];
    if (
      req.user &&
      userRoles.includes('student') &&
      !userRoles.includes('admin') &&
      !userRoles.includes('coordinator') &&
      reg.studentId !== req.user._id.toString() &&
      reg.studentEmail.toLowerCase() !== req.user.email.toLowerCase()
    ) {
      res.status(403).json({ success: false, message: 'Forbidden. You cannot cancel someone else’s registration.' });
      return;
    }

    // Paid + confirmed registrations are locked. Participants can no longer cancel after payment completes.
    const isPaidConfirmed = reg.paymentStatus === 'PAID' && reg.registrationStatus === 'CONFIRMED';
    if (isPaidConfirmed && !userRoles.includes('admin')) {
      res.status(400).json({
        success: false,
        message: 'Paid confirmed registrations cannot be cancelled. Please contact the event coordinator for assistance.',
      });
      return;
    }

    const wasConfirmed = reg.registrationStatus === 'CONFIRMED';
    reg.registrationStatus = 'CANCELLED';
    await reg.save();

    if (wasConfirmed) {
      await Event.findByIdAndUpdate(reg.event, { $inc: { registeredCount: -1 } });
    }

    res.status(200).json({
      success: true,
      message: 'Registration cancelled successfully. Your reserved seat has been released.',
      registration: reg.toJSON(),
    });
  } catch (error: any) {
    console.error('[Cancel Registration Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to cancel registration.' });
  }
}

// DELETE /api/registrations/:id
export async function deleteRegistration(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const reg = await Registration.findById(id);

    if (!reg) {
      res.status(404).json({ success: false, message: 'Registration record not found.' });
      return;
    }

    // Owner or admin only (coordinators cannot delete other students' records).
    const userRoles = (req.user as AuthUser)?.roles || [];
    const isOwner = String(reg.studentId) === String(req.user?._id);
    if (!isOwner && !userRoles.includes('admin')) {
      res.status(404).json({ success: false, message: 'Registration record not found.' });
      return;
    }

    // Only allow deletion if cancelled or pending, or if admin
    if (reg.registrationStatus === 'CONFIRMED' && !userRoles.includes('admin')) {
      res.status(400).json({ success: false, message: 'Active confirmed registrations must be cancelled first.' });
      return;
    }

    await Registration.findByIdAndDelete(reg._id);

    res.status(200).json({
      success: true,
      message: 'Registration record permanently removed.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete registration.' });
  }
}

// POST /api/registrations/check-in (Coordinator or Admin)
export async function checkInAttendee(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { tokenOrId } = req.body;

    if (!tokenOrId) {
      res.status(400).json({ success: false, message: 'QR token or Registration ID is required for check-in.' });
      return;
    }

    const query: any = {
      $or: [
        { qrToken: tokenOrId },
        { _id: tokenOrId.match(/^[0-9a-fA-F]{24}$/) ? tokenOrId : null },
      ],
    };

    const reg = await Registration.findOne(query);

    if (!reg) {
      res.status(404).json({
        success: false,
        valid: false,
        message: 'Invalid Pass: No corresponding registration record found in symposium system.',
      });
      return;
    }

    if (reg.registrationStatus !== 'CONFIRMED') {
      res.status(400).json({
        success: false,
        valid: false,
        message: `Pass is ${reg.registrationStatus}. Entry cannot be authorized.`,
      });
      return;
    }

    if (reg.checkedIn) {
      res.status(200).json({
        success: true,
        valid: true,
        alreadyCheckedIn: true,
        message: `Attendee was ALREADY checked in on ${reg.checkedInAt ? new Date(reg.checkedInAt).toLocaleTimeString() : 'earlier'}.`,
        attendee: {
          name: reg.studentName,
          email: reg.studentEmail,
          college: reg.college,
          event: reg.eventName,
          checkedInAt: reg.checkedInAt,
        },
      });
      return;
    }

    // Atomic check-in: exactly one concurrent scan can flip the flag.
    const checkedIn = await Registration.findOneAndUpdate(
      { _id: reg._id, checkedIn: { $ne: true } },
      { $set: { checkedIn: true, checkedInAt: new Date() } },
      { new: true }
    );

    if (!checkedIn) {
      const fresh = await Registration.findById(reg._id);
      res.status(200).json({
        success: true,
        valid: true,
        alreadyCheckedIn: true,
        message: `Attendee was ALREADY checked in on ${fresh?.checkedInAt ? new Date(fresh.checkedInAt).toLocaleTimeString() : 'earlier'}.`,
        attendee: {
          name: reg.studentName,
          email: reg.studentEmail,
          college: reg.college,
          event: reg.eventName,
          checkedInAt: fresh?.checkedInAt || reg.checkedInAt,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      valid: true,
      alreadyCheckedIn: false,
      message: `Verified! Welcome ${reg.studentName} to ${reg.eventName}. Turnstile authorized.`,
      attendee: {
        name: reg.studentName,
        email: reg.studentEmail,
        college: reg.college,
        event: reg.eventName,
        checkedInAt: checkedIn.checkedInAt,
      },
    });
  } catch (error: any) {
    console.error('[Check-in Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Error processing check-in.' });
  }
}
