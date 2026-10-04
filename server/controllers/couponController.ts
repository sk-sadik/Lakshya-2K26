import { Request, Response } from 'express';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { FoodCoupon, IFoodCoupon } from '../models/FoodCoupon';
import { User } from '../models/User';
import { Registration } from '../models/Registration';
import { Event } from '../models/Event';
import { sendFoodCouponEmail } from '../services/emailService';
import { AuthenticatedRequest } from '../middleware/auth';


/**
 * Generate a unique coupon code with guaranteed uniqueness
 */
async function generateUniqueCouponCode(): Promise<string> {
  let isUnique = false;
  let code = '';
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
    code = `LAKSHYA-FOOD-${randomPart}`;
    const existing = await FoodCoupon.findOne({ couponCode: code });
    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    code = `LAKSHYA-FOOD-${Date.now().toString(36).toUpperCase()}`;
  }

  return code;
}

// POST /api/coupons/generate
export async function generateCoupon(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { mealType, mealDescription, email, eventId } = req.body;

    // 1. Authenticate / Identify user
    let user = req.user;
    if (!user && email) {
      const foundUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (foundUser) {
        user = foundUser as any;
      }
    }

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in to claim your food coupon.',
      });
      return;
    }

    const userEmail = user.email.toLowerCase().trim();

    // Optional event linkage: one pass per (event, participant)
    let linkedEventKey: string | null = null;
    let linkedEventName: string | undefined;
    if (eventId) {
      const event = await findEventByIdOrCustom(String(eventId));
      if (!event) {
        res.status(404).json({ success: false, message: 'Event not found.' });
        return;
      }
      if (!ownsEventOrAdmin(event, req.user)) {
        res.status(403).json({ success: false, message: 'You can only generate passes for your own events.' });
        return;
      }
      linkedEventKey = event._id.toString();
      linkedEventName = event.eventName;
    }

    // 2. Duplicate check: per-event when linked, otherwise global (legacy behaviour)
    const existingCoupon = linkedEventKey
      ? await FoodCoupon.findOne({ eventId: linkedEventKey, userEmail }).sort({ createdAt: -1 })
      : await FoodCoupon.findOne({
          $or: [{ user: user._id }, { userEmail }],
        }).sort({ createdAt: -1 });

    if (existingCoupon) {
      if (existingCoupon.status === 'USED') {
        res.status(400).json({
          success: false,
          message: `You have already redeemed your Lakshya 2026 food coupon on ${existingCoupon.redeemedAt?.toLocaleString() || 'record'}.`,
          coupon: existingCoupon.toJSON(),
        });
        return;
      }

      if (existingCoupon.status === 'ACTIVE' && new Date() <= existingCoupon.expiryDate) {
        // Return existing active coupon to prevent duplicate generation
        res.status(200).json({
          success: true,
          message: 'You already have an active food coupon! Details retrieved.',
          coupon: existingCoupon.toJSON(),
          emailDelivered: true,
        });
        return;
      }
    }

    // 3. Generate unique coupon code & QR
    const couponCode = await generateUniqueCouponCode();

    // Generate QR Code data URL
    let qrCodeDataUrl: string | undefined;
    try {
      qrCodeDataUrl = await QRCode.toDataURL(couponCode, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 300,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
    } catch (qrErr) {
      console.error('[Coupon Controller] QR Code generation error:', qrErr);
    }

    // Expiry: 24 hours from issuance or end of event
    const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const assignedMealType = mealType || 'Lakshya Grand Symposium Feast & Refreshment';
    const assignedMealDesc = mealDescription || 'Complimentary full-course meal voucher including special lunch combo, dessert, and evening beverage.';
    const venue = 'Central Food Court & Dining Arena, LBRCE Campus';

    // 4. Save coupon to MongoDB
    const newCoupon = await FoodCoupon.create({
      couponCode,
      user: user._id,
      userId: user._id.toString(),
      userName: user.name || 'Lakshya Participant',
      userEmail,
      college: (user as any).college || 'Lakireddy Bali Reddy College of Engineering (Autonomous)',
      department: (user as any).department || 'cse',
      eventId: linkedEventKey || undefined,
      eventName: linkedEventName,
      issuedBy: req.user?.name,
      issuedByEmail: ((req.user as any)?.email || '').toLowerCase().trim() || undefined,
      mealType: assignedMealType,
      mealDescription: assignedMealDesc,
      venue,
      status: 'ACTIVE',
      generatedDate: new Date(),
      expiryDate,
      qrCodeDataUrl,
    });

    // 5. Send coupon to user's real email via SMTP
    const emailResult = await sendFoodCouponEmail({
      to: userEmail,
      name: user.name || 'Lakshya Attendee',
      couponCode,
      mealType: assignedMealType,
      mealDescription: assignedMealDesc,
      venue,
      expiryDate,
      qrCodeDataUrl,
    });

    res.status(201).json({
      success: true,
      message: emailResult.success
        ? `Food coupon generated successfully and dispatched to ${userEmail}!`
        : `Food coupon generated in MongoDB. (Note: Email delivery warning: ${emailResult.error})`,
      coupon: newCoupon.toJSON(),
      emailDelivered: emailResult.success,
      emailError: emailResult.error,
    });
  } catch (error: any) {
    console.error('[Coupon Generate Error]', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating food coupon.',
    });
  }
}

// GET /api/coupons/my
export async function getMyCoupons(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const coupons = await FoodCoupon.find({
      $or: [{ user: req.user._id }, { userEmail: req.user.email.toLowerCase().trim() }],
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      coupons: coupons.map((c) => c.toJSON()),
    });
  } catch (error: any) {
    console.error('[Get My Coupons Error]', error);
    res.status(500).json({ success: false, message: 'Error retrieving coupons.' });
  }
}

// GET /api/coupons/:id
export async function getCouponById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    let coupon: IFoodCoupon | null = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      coupon = await FoodCoupon.findById(id);
    }

    if (!coupon) {
      coupon = await FoodCoupon.findOne({ couponCode: id.toUpperCase().trim() });
    }

    if (!coupon) {
      res.status(404).json({ success: false, message: 'Food coupon not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      coupon: coupon.toJSON(),
    });
  } catch (error: any) {
    console.error('[Get Coupon Error]', error);
    res.status(500).json({ success: false, message: 'Error fetching coupon.' });
  }
}

// POST /api/coupons/:id/redeem or POST /api/coupons/redeem
export async function redeemCoupon(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const target = req.params.id || req.body.couponCode || req.body.couponId;

    if (!target) {
      res.status(400).json({ success: false, message: 'Coupon ID or Coupon Code is required.' });
      return;
    }

    const cleanTarget = target.toString().trim();
    let coupon: IFoodCoupon | null = null;

    if (cleanTarget.match(/^[0-9a-fA-F]{24}$/)) {
      coupon = await FoodCoupon.findById(cleanTarget);
    }

    if (!coupon) {
      coupon = await FoodCoupon.findOne({ couponCode: cleanTarget.toUpperCase() });
    }

    if (!coupon) {
      res.status(404).json({ success: false, message: 'Coupon not found with the provided code.' });
      return;
    }

    // Check status
    if (coupon.status === 'USED') {
      res.status(400).json({
        success: false,
        message: `This coupon has ALREADY been used on ${coupon.redeemedAt?.toLocaleString()} by ${coupon.redeemedBy || 'Staff'}. Re-use is prohibited.`,
        coupon: coupon.toJSON(),
      });
      return;
    }

    if (coupon.status === 'CANCELLED') {
      res.status(400).json({
        success: false,
        message: 'This coupon has been cancelled.',
        coupon: coupon.toJSON(),
      });
      return;
    }

    if (new Date() > coupon.expiryDate || coupon.status === 'EXPIRED') {
      coupon.status = 'EXPIRED';
      await coupon.save();
      res.status(400).json({
        success: false,
        message: 'This coupon has expired and cannot be redeemed.',
        coupon: coupon.toJSON(),
      });
      return;
    }

    // Atomic redemption
    coupon.status = 'USED';
    coupon.redeemedAt = new Date();
    coupon.redeemedBy = req.user?.name || req.body.staffName || 'Dining Coordinator';
    await coupon.save();

    console.log(`[Coupon Redeemed] Code: ${coupon.couponCode}, User: ${coupon.userEmail}, RedeemedBy: ${coupon.redeemedBy}`);

    res.status(200).json({
      success: true,
      message: `Coupon ${coupon.couponCode} redeemed successfully! Meal authorized for ${coupon.userName}.`,
      coupon: coupon.toJSON(),
    });
  } catch (error: any) {
    console.error('[Redeem Coupon Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Error redeeming coupon.' });
  }
}

// POST /api/coupons/verify
export async function verifyCoupon(req: Request, res: Response): Promise<void> {
  try {
    const { couponCode } = req.body;
    if (!couponCode) {
      res.status(400).json({ success: false, message: 'Coupon code is required.' });
      return;
    }

    const cleanCode = couponCode.toString().trim().toUpperCase();
    const coupon = await FoodCoupon.findOne({ couponCode: cleanCode });

    if (!coupon) {
      res.status(404).json({ success: false, message: 'Coupon not found.' });
      return;
    }

    const isExpired = new Date() > coupon.expiryDate;
    const isValid = coupon.status === 'ACTIVE' && !isExpired;

    res.status(200).json({
      success: true,
      isValid,
      status: isExpired ? 'EXPIRED' : coupon.status,
      coupon: coupon.toJSON(),
    });
  } catch (error: any) {
    console.error('[Verify Coupon Error]', error);
    res.status(500).json({ success: false, message: 'Error verifying coupon.' });
  }
}

/**
 * Resolve an event by Mongo ObjectId or customId. Returns null when not found.
 */
async function findEventByIdOrCustom(eventId: string): Promise<any> {
  if (String(eventId).match(/^[0-9a-fA-F]{24}$/)) {
    const byId = await Event.findById(eventId);
    if (byId) return byId;
  }
  return Event.findOne({ customId: eventId });
}

/**
 * Coordinator ownership check: owns the event, or is an admin (admins bypass).
 */
function ownsEventOrAdmin(event: any, user: any): boolean {
  const roles: string[] = Array.isArray(user?.roles) ? user.roles : [user?.role].filter(Boolean);
  if (roles.includes('admin')) return true;
  const userEmail = (user?.email || '').toLowerCase().trim();
  return (
    String(event.coordinator || '') === String(user?._id) ||
    (event.coordinatorEmail || '').toLowerCase().trim() === userEmail
  );
}

/**
 * All confirmed registrations for one event, matching both ObjectId and string id forms.
 */
async function findConfirmedRegsForEvent(event: any): Promise<any[]> {
  const orConditions: any[] = [{ eventId: event._id.toString() }];
  if (String(event._id).match(/^[0-9a-fA-F]{24}$/)) {
    orConditions.push({ event: event._id });
  }
  if (event.customId) {
    orConditions.push({ eventId: event.customId });
  }
  return Registration.find({
    $or: orConditions,
    registrationStatus: 'CONFIRMED',
  });
}

// GET /api/coupons (Admin: all coupons; Coordinator: only coupons of their own events)
export async function getAllCoupons(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { eventId } = (req.query || {}) as any;
    const filter: any = {};
    if (eventId) {
      const event = await findEventByIdOrCustom(String(eventId));
      filter.eventId = event ? event._id.toString() : String(eventId);
    }

    // Coordinators (non-admin) only ever see coupons issued for their own events
    const roles: string[] = Array.isArray((req.user as any)?.roles)
      ? (req.user as any).roles
      : [(req.user as any)?.role].filter(Boolean);
    if (!roles.includes('admin')) {
      const userEmail = ((req.user as any)?.email || '').toLowerCase().trim();
      const ownEvents = await Event.find({
        $or: [{ coordinator: (req.user as any)?._id }, { coordinatorEmail: userEmail }],
      });
      const ownIds = new Set(ownEvents.map((e: any) => e._id.toString()));
      if (filter.eventId && !ownIds.has(filter.eventId)) {
        res.status(403).json({ success: false, message: 'You can only view coupons of your own events.' });
        return;
      }
      if (!filter.eventId) {
        filter.eventId = { $in: Array.from(ownIds) };
      }
    }

    const coupons = await FoodCoupon.find(filter).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      coupons: coupons.map((c) => c.toJSON()),
      total: coupons.length,
      activeCount: coupons.filter((c) => c.status === 'ACTIVE').length,
      usedCount: coupons.filter((c) => c.status === 'USED').length,
    });
  } catch (error: any) {
    console.error('[Get All Coupons Error]', error);
    res.status(500).json({ success: false, message: 'Error retrieving coupons.' });
  }
}

// POST /api/coupons/bulk-generate-for-participants
// Generate ONE food pass per (event, participant). A student registered in 3 events
// receives 3 passes — one issued per event. Coordinators may only generate for their own events.
export async function generateTokensForEventParticipants(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { mealType, mealDescription, eventId } = req.body || {};

    // 1. Resolve target events (single event when eventId given, else every event with confirmed regs)
    let targetEvents: any[] = [];
    if (eventId) {
      const event = await findEventByIdOrCustom(String(eventId));
      if (!event) {
        res.status(404).json({ success: false, message: 'Event not found.' });
        return;
      }
      if (!ownsEventOrAdmin(event, req.user)) {
        res.status(403).json({ success: false, message: 'You can only generate passes for your own events.' });
        return;
      }
      targetEvents = [event];
    } else {
      const regs = await Registration.find({ registrationStatus: 'CONFIRMED' }).select('event eventId');
      const keys = new Set<string>();
      for (const r of regs) {
        if ((r as any).event) keys.add(String((r as any).event));
        else if ((r as any).eventId) keys.add(String((r as any).eventId));
      }
      const found = await Event.find({ _id: { $in: Array.from(keys).filter((k) => k.match(/^[0-9a-fA-F]{24}$/)) } });
      const byId = new Map(found.map((e: any) => [e._id.toString(), e]));
      targetEvents = Array.from(keys).map((k) => byId.get(k)).filter(Boolean);
    }

    if (targetEvents.length === 0) {
      res.status(200).json({
        success: true,
        message: 'No confirmed event participants found to generate tokens for.',
        stats: {
          totalEventRegistrations: 0,
          uniqueParticipants: 0,
          newTokensGenerated: 0,
          alreadyHadTokens: 0,
          emailsDispatched: 0,
        },
      });
      return;
    }

    const assignedMealType = mealType || 'Lakshya Grand Symposium Feast & Refreshment';
    const assignedMealDesc = mealDescription || 'Complimentary full-course meal voucher including special lunch combo, dessert, and evening beverage.';
    const venue = 'Central Food Court & Dining Arena, LBRCE Campus';
    const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const issuedBy = req.user?.name || 'Coordinator';
    const issuedByEmail = ((req.user as any)?.email || '').toLowerCase().trim();

    let totalEventRegistrations = 0;
    let newTokensGenerated = 0;
    let alreadyHadTokens = 0;
    const generatedTokensList: any[] = [];
    const perEvent: { eventName: string; generated: number; skipped: number }[] = [];

    // 2. One pass per (event, participant)
    for (const event of targetEvents) {
      const eventKey = event._id.toString();
      const regs = await findConfirmedRegsForEvent(event);
      totalEventRegistrations += regs.length;
      let generated = 0;
      let skipped = 0;

      // Unique students within this event
      const seen = new Set<string>();
      for (const reg of regs) {
        const email = (reg.studentEmail || '').toLowerCase().trim();
        if (!email || seen.has(email)) continue;
        seen.add(email);

        const existing = await FoodCoupon.findOne({ eventId: eventKey, userEmail: email });
        if (existing) {
          skipped++;
          continue;
        }

        const couponCode = await generateUniqueCouponCode();
        let qrCodeDataUrl: string | undefined;
        try {
          qrCodeDataUrl = await QRCode.toDataURL(couponCode, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 300,
            color: { dark: '#0f172a', light: '#ffffff' },
          });
        } catch (err) {
          console.error('[Bulk Generator] QR generation error:', err);
        }

        try {
          const newCoupon = await FoodCoupon.create({
            couponCode,
            user: reg.studentId && String(reg.studentId).match(/^[0-9a-fA-F]{24}$/)
              ? reg.studentId
              : undefined,
            userId: reg.studentId || 'event-participant',
            userName: reg.studentName,
            userEmail: email,
            college: reg.college || 'Lakireddy Bali Reddy College of Engineering (Autonomous)',
            department: reg.department || 'cse',
            eventId: eventKey,
            eventName: event.eventName,
            issuedBy,
            issuedByEmail,
            mealType: assignedMealType,
            mealDescription: assignedMealDesc,
            venue,
            status: 'ACTIVE',
            generatedDate: new Date(),
            expiryDate,
            qrCodeDataUrl,
          });
          generated++;
          generatedTokensList.push(newCoupon.toJSON());
        } catch (createErr: any) {
          // Race-safe: unique (eventId, userEmail) index won the pass to another call
          if (createErr?.code === 11000) {
            skipped++;
          } else {
            throw createErr;
          }
        }
      }

      newTokensGenerated += generated;
      alreadyHadTokens += skipped;
      perEvent.push({ eventName: event.eventName, generated, skipped });
    }

    res.status(201).json({
      success: true,
      message: `Generated ${newTokensGenerated} food pass(es) across ${targetEvents.length} event(s)! (${alreadyHadTokens} already had passes for their event.) Each pass is emailed by its event coordinator.`,
      stats: {
        totalEventRegistrations,
        uniqueParticipants: totalEventRegistrations,
        newTokensGenerated,
        alreadyHadTokens,
        emailsDispatched: 0,
      },
      perEvent,
      tokens: generatedTokensList,
    });
  } catch (error: any) {
    console.error('[Bulk Generate Participant Tokens Error]', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating food tokens for participants.',
    });
  }
}

// POST /api/coupons/send-emails-to-participants
// Email the issued passes of ONE event to its participants (coordinator: own events only).
// Without eventId (admin global), emails every issued pass.
export async function sendCouponEmailsToParticipants(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { eventId } = req.body || {};

    let eventKey: string | null = null;
    if (eventId) {
      const event = await findEventByIdOrCustom(String(eventId));
      if (!event) {
        res.status(404).json({ success: false, message: 'Event not found.' });
        return;
      }
      if (!ownsEventOrAdmin(event, req.user)) {
        res.status(403).json({ success: false, message: 'You can only email passes for your own events.' });
        return;
      }
      eventKey = event._id.toString();
    }

    // Only the passes issued for this event (legacy passes without eventId are
    // included only in the admin global send, never in a coordinator's event send)
    const couponFilter: any = eventKey ? { eventId: eventKey } : {};
    if (!eventKey) {
      const roles: string[] = Array.isArray((req.user as any)?.roles)
        ? (req.user as any).roles
        : [(req.user as any)?.role].filter(Boolean);
      if (!roles.includes('admin')) {
        const userEmail = ((req.user as any)?.email || '').toLowerCase().trim();
        const ownEvents = await Event.find({
          $or: [{ coordinator: (req.user as any)?._id }, { coordinatorEmail: userEmail }],
        });
        couponFilter.eventId = { $in: ownEvents.map((e: any) => e._id.toString()) };
      }
    }
    const coupons = await FoodCoupon.find(couponFilter);

    if (coupons.length === 0) {
      res.status(200).json({
        success: true,
        message: eventKey
          ? 'No food passes have been generated for this event yet. Generate them first.'
          : 'No food passes issued yet.',
        stats: { targetParticipants: 0, couponsFound: 0, sent: 0, failed: 0, failedEmails: [] },
      });
      return;
    }

    // 3. Dispatch each pass to the participant's mailbox
    let sent = 0;
    let failed = 0;
    const failedEmails: string[] = [];

    for (const coupon of coupons) {
      const emailResult = await sendFoodCouponEmail({
        to: coupon.userEmail,
        name: coupon.userName,
        couponCode: coupon.couponCode,
        mealType: coupon.mealType,
        mealDescription: coupon.mealDescription,
        venue: coupon.venue,
        expiryDate: coupon.expiryDate,
        qrCodeDataUrl: coupon.qrCodeDataUrl,
      });

      if (emailResult.success) {
        sent++;
      } else {
        failed++;
        failedEmails.push(coupon.userEmail);
      }
    }

    res.status(200).json({
      success: true,
      message: failed > 0
        ? `Food passes dispatched: ${sent} emailed successfully, ${failed} failed. Check failedEmails for details.`
        : `All ${sent} food passes were emailed successfully to participants.`,
      stats: {
        targetParticipants: coupons.length,
        couponsFound: coupons.length,
        sent,
        failed,
        failedEmails,
      },
    });
  } catch (error: any) {
    console.error('[Send Coupons To Participants Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Error emailing food passes to participants.' });
  }
}

// POST /api/coupons/send-to-email (Admin only: generate AND email a coupon to any address, regardless of event participation)
export async function sendCouponToEmailAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { email, name, mealType, mealDescription } = req.body || {};

    if (!email) {
      res.status(400).json({ success: false, message: 'Recipient email is required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
      return;
    }

    // Reuse an existing active (non-expired) coupon for this email to avoid duplicates
    const existing = await FoodCoupon.findOne({ userEmail: normalizedEmail }).sort({ createdAt: -1 });
    if (existing) {
      if (existing.status === 'ACTIVE' && new Date() <= existing.expiryDate) {
        const resend = await sendFoodCouponEmail({
          to: normalizedEmail,
          name: existing.userName,
          couponCode: existing.couponCode,
          mealType: existing.mealType,
          mealDescription: existing.mealDescription,
          venue: existing.venue,
          expiryDate: existing.expiryDate,
          qrCodeDataUrl: existing.qrCodeDataUrl,
        });

        res.status(200).json({
          success: true,
          message: resend.success
            ? `Existing active food coupon ${existing.couponCode} re-sent to ${normalizedEmail}!`
            : `Coupon exists for ${normalizedEmail} but email delivery failed: ${resend.error}`,
          coupon: existing.toJSON(),
          emailDelivered: resend.success,
          emailError: resend.error,
        });
        return;
      }

      if (existing.status === 'USED') {
        res.status(400).json({
          success: false,
          message: `A coupon for ${normalizedEmail} was already redeemed on ${existing.redeemedAt?.toLocaleString() || 'record'}. A new one cannot be issued.`,
          coupon: existing.toJSON(),
        });
        return;
      }
    }

    // Generate a brand-new coupon for this email (works for participants AND non-participants)
    const couponCode = await generateUniqueCouponCode();

    let qrCodeDataUrl: string | undefined;
    try {
      qrCodeDataUrl = await QRCode.toDataURL(couponCode, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 300,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
    } catch (err) {
      console.error('[Send Coupon To Email] QR generation error:', err);
    }

    const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const assignedMealType = mealType || 'Lakshya Grand Symposium Feast & Refreshment';
    const assignedMealDesc = mealDescription || 'Complimentary full-course meal voucher including special lunch combo, dessert, and evening beverage.';
    const venue = 'Central Food Court & Dining Arena, LBRCE Campus';

    const existingUser = await User.findOne({ email: normalizedEmail });

    const newCoupon = await FoodCoupon.create({
      couponCode,
      user: existingUser?._id,
      userId: existingUser ? existingUser._id.toString() : 'manual-send',
      userName: (name && name.trim()) || existingUser?.name || normalizedEmail.split('@')[0],
      userEmail: normalizedEmail,
      college: existingUser?.college || 'Lakireddy Bali Reddy College of Engineering (Autonomous)',
      department: existingUser?.department || 'cse',
      mealType: assignedMealType,
      mealDescription: assignedMealDesc,
      venue,
      status: 'ACTIVE',
      generatedDate: new Date(),
      expiryDate,
      qrCodeDataUrl,
    });

    const emailResult = await sendFoodCouponEmail({
      to: normalizedEmail,
      name: newCoupon.userName,
      couponCode,
      mealType: assignedMealType,
      mealDescription: assignedMealDesc,
      venue,
      expiryDate,
      qrCodeDataUrl,
    });

    res.status(201).json({
      success: true,
      message: emailResult.success
        ? `Food coupon ${couponCode} generated and sent to ${normalizedEmail}!`
        : `Food coupon generated for ${normalizedEmail} but email delivery failed: ${emailResult.error}`,
      coupon: newCoupon.toJSON(),
      emailDelivered: emailResult.success,
      emailError: emailResult.error,
    });
  } catch (error: any) {
    console.error('[Send Coupon To Email Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Error sending food coupon to email.' });
  }
}

// POST /api/coupons/:id/send-email (Coordinator/Admin: dispatch an existing coupon to the participant via email)
export async function sendCouponEmailById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    let coupon: IFoodCoupon | null = null;
    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      coupon = await FoodCoupon.findById(id);
    }

    if (!coupon) {
      res.status(404).json({ success: false, message: 'Food coupon not found.' });
      return;
    }

    const emailResult = await sendFoodCouponEmail({
      to: coupon.userEmail,
      name: coupon.userName,
      couponCode: coupon.couponCode,
      mealType: coupon.mealType,
      mealDescription: coupon.mealDescription,
      venue: coupon.venue,
      expiryDate: coupon.expiryDate,
      qrCodeDataUrl: coupon.qrCodeDataUrl,
    });

    if (!emailResult.success) {
      res.status(500).json({
        success: false,
        message: `Food pass could not be emailed to ${coupon.userEmail}: ${emailResult.error || 'SMTP failure.'}`,
        coupon: coupon.toJSON(),
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Food pass successfully emailed to ${coupon.userEmail}!`,
      coupon: coupon.toJSON(),
      emailDelivered: true,
    });
  } catch (error: any) {
    console.error('[Send Coupon Email Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Error emailing food coupon.' });
  }
}

