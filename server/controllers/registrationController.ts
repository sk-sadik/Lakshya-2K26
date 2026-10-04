import { Response } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { Registration } from '../models/Registration';
import { Event } from '../models/Event';
import { User } from '../models/User';
import { generateRegistrationQR } from '../services/qrService';
import { AuthenticatedRequest, AuthUser } from '../middleware/auth';

function getRazorpayInstance(): Razorpay | null {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (key_id && key_secret) {
    return new Razorpay({ key_id, key_secret });
  }
  return null;
}

// POST /api/events/:id/register
export async function registerForEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id: eventId } = req.params;
    const {
      studentName,
      studentEmail,
      studentPhone,
      studentRollNo,
      college,
      department,
      teamMembers,
    } = req.body;

    // 1. Identify User
    let studentUser = req.user;
    if (!studentUser) {
      // If studentEmail is provided in body, check if user exists
      if (!studentEmail) {
        res.status(401).json({ success: false, message: 'Please log in to register for symposium events.' });
        return;
      }
      studentUser = (await User.findOne({ email: studentEmail.toLowerCase().trim() })) || undefined;
      if (!studentUser) {
        res.status(401).json({ success: false, message: 'Account not found. Please log in or register.' });
        return;
      }
    }

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

    // 4. Validate Event Status & Capacity
    if (event.status === 'cancelled') {
      res.status(400).json({ success: false, message: 'This event has been cancelled and cannot accept registrations.' });
      return;
    }

    if (event.registrationDeadline) {
      const deadline = new Date(event.registrationDeadline);
      if (!isNaN(deadline.getTime()) && new Date() > deadline) {
        res.status(400).json({ success: false, message: 'The registration deadline for this event has passed.' });
        return;
      }
    }

    if (event.maxParticipants && event.registeredCount >= event.maxParticipants) {
      res.status(400).json({ success: false, message: 'Event capacity is full. Registrations are closed.' });
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

    const regStudentName = studentName || studentUser.name;
    const regStudentEmail = (studentEmail || studentUser.email).toLowerCase().trim();
    const regStudentPhone = studentPhone || studentUser.phone || '';
    const regStudentRollNo = (studentRollNo || (studentUser as any).rollNo || '').toString().trim().toUpperCase();
    const regCollege = college || studentUser.college;
    const regDepartment = department || studentUser.department;

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
          teamMembers,
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
      // PAID EVENT: Create Pending Registration and Razorpay Order
      const amountInPaise = Math.round(event.feeAmount * 100);
      let orderId = `order_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      const razorpay = getRazorpayInstance();
      if (razorpay) {
        try {
          const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: 'INR',
            receipt: `rcpt_${Date.now().toString().slice(-8)}`,
            notes: {
              eventId: event._id.toString(),
              eventName: event.eventName,
              studentEmail: regStudentEmail,
            },
          });
          orderId = order.id;
        } catch (err: any) {
          console.warn('[Razorpay API Warning]', err.message);
        }
      }

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
        teamMembers,
        paymentOrderId: orderId,
        paymentAmount: event.feeAmount,
        paymentStatus: 'PENDING',
        registrationStatus: 'PENDING',
      });

      res.status(201).json({
        success: true,
        message: 'Registration initiated. Please complete payment to confirm your spot and generate your pass.',
        isPaid: true,
        registration: newReg.toJSON(),
        paymentOrder: {
          id: orderId,
          amount: amountInPaise,
          currency: 'INR',
          key: process.env.RAZORPAY_KEY_ID || 'rzp_test_lakshya2026Key',
          eventName: event.eventName,
          entryFee: event.entryFee,
          studentName: regStudentName,
          studentEmail: regStudentEmail,
          studentPhone: regStudentPhone,
        },
      });
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
export async function getRegistrationById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const reg = await Registration.findById(id);

    if (!reg) {
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

    // Only allow deletion if cancelled or pending, or if admin
    const userRoles = (req.user as AuthUser)?.roles || [];
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

    reg.checkedIn = true;
    reg.checkedInAt = new Date();
    await reg.save();

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
        checkedInAt: reg.checkedInAt,
      },
    });
  } catch (error: any) {
    console.error('[Check-in Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Error processing check-in.' });
  }
}
