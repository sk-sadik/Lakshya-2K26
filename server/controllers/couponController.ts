import { Request, Response } from 'express';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { FoodCoupon, IFoodCoupon } from '../models/FoodCoupon';
import { User } from '../models/User';
import { Registration } from '../models/Registration';
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
    const { mealType, mealDescription, email } = req.body;

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

    // 2. Check if user already has an active or used coupon
    const existingCoupon = await FoodCoupon.findOne({
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

// GET /api/coupons (Admin: View all food coupons)
export async function getAllCoupons(_req: Request, res: Response): Promise<void> {
  try {
    const coupons = await FoodCoupon.find().sort({ createdAt: -1 });
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

// POST /api/coupons/bulk-generate-for-participants (Admin: Generate tokens ONLY for event registered participants)
export async function generateTokensForEventParticipants(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { mealType, mealDescription, eventId } = req.body;

    // 1. Fetch only confirmed registrations in events (not general users)
    const query: any = { registrationStatus: 'CONFIRMED' };
    if (eventId) {
      query.eventId = eventId;
    }

    const confirmedRegistrations = await Registration.find(query);

    if (confirmedRegistrations.length === 0) {
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

    // 2. Group by unique participant email to ensure 1 food pass per distinct participant
    const uniqueParticipantsMap = new Map<string, {
      studentId: string;
      studentName: string;
      studentEmail: string;
      studentPhone?: string;
      college: string;
      department: string;
      eventName: string;
    }>();

    for (const reg of confirmedRegistrations) {
      const email = reg.studentEmail.toLowerCase().trim();
      if (!uniqueParticipantsMap.has(email)) {
        uniqueParticipantsMap.set(email, {
          studentId: reg.studentId || (reg.student ? reg.student.toString() : ''),
          studentName: reg.studentName,
          studentEmail: email,
          studentPhone: reg.studentPhone,
          college: reg.college || 'Lakireddy Bali Reddy College of Engineering (Autonomous)',
          department: reg.department || 'cse',
          eventName: reg.eventName,
        });
      }
    }

    const uniqueParticipants = Array.from(uniqueParticipantsMap.values());
    const totalUniqueParticipants = uniqueParticipants.length;

    let newTokensGenerated = 0;
    let alreadyHadTokens = 0;
    const generatedTokensList: any[] = [];

    const assignedMealType = mealType || 'Lakshya Grand Symposium Feast & Refreshment';
    const assignedMealDesc = mealDescription || 'Complimentary full-course meal voucher including special lunch combo, dessert, and evening beverage.';
    const venue = 'Central Food Court & Dining Arena, LBRCE Campus';
    const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // 3. Process each unique event participant
    for (const participant of uniqueParticipants) {
      // Check if participant already has an active or used coupon
      const existing = await FoodCoupon.findOne({
        $or: [
          { userEmail: participant.studentEmail },
          { userId: participant.studentId },
        ],
      });

      if (existing) {
        alreadyHadTokens++;
        continue;
      }

      // Generate unique token code
      const couponCode = await generateUniqueCouponCode();

      // Generate QR Code data URL
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

      // Create FoodCoupon record in MongoDB
      const newCoupon = await FoodCoupon.create({
        couponCode,
        user: participant.studentId && participant.studentId.match(/^[0-9a-fA-F]{24}$/)
          ? participant.studentId
          : undefined,
        userId: participant.studentId || 'event-participant',
        userName: participant.studentName,
        userEmail: participant.studentEmail,
        college: participant.college,
        department: participant.department,
        mealType: assignedMealType,
        mealDescription: assignedMealDesc,
        venue,
        status: 'ACTIVE',
        generatedDate: new Date(),
        expiryDate,
        qrCodeDataUrl,
      });

      newTokensGenerated++;
      generatedTokensList.push(newCoupon.toJSON());
    }

    res.status(201).json({
      success: true,
      message: `Generated ${newTokensGenerated} tokens for verified event participants! (${alreadyHadTokens} already had valid tokens). Tokens are now available for coordinators to dispatch via email.`,
      stats: {
        totalEventRegistrations: confirmedRegistrations.length,
        uniqueParticipants: totalUniqueParticipants,
        newTokensGenerated,
        alreadyHadTokens,
        emailsDispatched: 0,
      },
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

// POST /api/coupons/send-emails-to-participants (Coordinator/Admin: bulk dispatch all issued passes to confirmed event participants via email)
export async function sendCouponEmailsToParticipants(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { eventId } = req.body || {};

    // 1. Determine target participant emails from CONFIRMED event registrations (optionally per event)
    const query: any = { registrationStatus: 'CONFIRMED' };
    if (eventId) {
      query.$or = [{ event: eventId }, { eventId }];
    }

    const confirmedRegistrations = await Registration.find(query);
    const uniqueEmailSet = new Set<string>();
    confirmedRegistrations.forEach((r) => {
      const email = (r.studentEmail || '').toLowerCase().trim();
      if (email) uniqueEmailSet.add(email);
    });
    const targetEmails = Array.from(uniqueEmailSet);

    if (targetEmails.length === 0) {
      res.status(200).json({
        success: true,
        message: 'No confirmed event participants found with issued food passes to dispatch.',
        stats: { targetParticipants: 0, couponsFound: 0, sent: 0, failed: 0, failedEmails: [] },
      });
      return;
    }

    // 2. Find the food passes issued to those participants
    const coupons = await FoodCoupon.find({ userEmail: { $in: targetEmails } });

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
        targetParticipants: targetEmails.length,
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

