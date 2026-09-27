import { Request, Response } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { Registration } from '../models/Registration';
import { Event } from '../models/Event';
import { generateRegistrationQR } from '../services/qrService';
import { AuthenticatedRequest } from '../middleware/auth';

function getRazorpayInstance(): Razorpay | null {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (key_id && key_secret && key_id !== 'rzp_test_your_key_id' && key_secret !== 'your_razorpay_secret_key') {
    return new Razorpay({
      key_id,
      key_secret,
    });
  }
  console.warn('[Razorpay] Using test mode - valid credentials not configured');
  return null;
}

// POST /api/payment/create-order
export async function createPaymentOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { registrationId } = req.body;

    if (!registrationId) {
      res.status(400).json({ success: false, message: 'Registration ID is required.' });
      return;
    }

    const reg = await Registration.findById(registrationId);
    if (!reg) {
      res.status(404).json({ success: false, message: 'Registration record not found.' });
      return;
    }

    if (reg.paymentStatus === 'PAID' && reg.registrationStatus === 'CONFIRMED') {
      res.status(400).json({ success: false, message: 'This registration is already paid and confirmed.' });
      return;
    }

    const event = await Event.findById(reg.event);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event details not found.' });
      return;
    }

    const amountInPaise = Math.round(event.feeAmount * 100);
    if (amountInPaise <= 0) {
      res.status(400).json({ success: false, message: 'This event has no registration fee.' });
      return;
    }

    const razorpay = getRazorpayInstance();
    let orderId = `order_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    if (razorpay) {
      try {
        const order = await razorpay.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: `rcpt_${reg._id.toString().slice(-8)}`,
          notes: {
            registrationId: reg._id.toString(),
            eventId: event._id.toString(),
            eventName: event.eventName,
            studentEmail: reg.studentEmail,
          },
        });
        orderId = order.id;
        console.log(`[Razorpay] Order created successfully: ${orderId}`);
      } catch (err: any) {
        console.error('[Razorpay API Error]', err);
        // Continue with test order ID if API fails
        console.warn('[Razorpay] Using test order ID due to API failure');
      }
    } else {
      console.log('[Razorpay] Using test mode - order will be simulated');
    }

    reg.paymentOrderId = orderId;
    reg.paymentAmount = event.feeAmount;
    reg.paymentStatus = 'PENDING';
    await reg.save();

    res.status(200).json({
      success: true,
      order: {
        id: orderId,
        amount: amountInPaise,
        currency: 'INR',
        key: process.env.RAZORPAY_KEY_ID || 'rzp_test_lakshya2026Key',
        eventName: event.eventName,
        eventFee: event.entryFee,
        studentName: reg.studentName,
        studentEmail: reg.studentEmail,
        studentPhone: reg.studentPhone,
        testMode: !razorpay,
      },
      registrationId: reg._id.toString(),
    });
  } catch (error: any) {
    console.error('[Create Payment Order Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Error creating payment order.' });
  }
}

// POST /api/payment/verify
export async function verifyPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { registrationId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!registrationId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({
        success: false,
        message: 'Missing required payment verification parameters (order ID, payment ID, signature).',
      });
      return;
    }

    const reg = await Registration.findById(registrationId);
    if (!reg) {
      res.status(404).json({ success: false, message: 'Registration record not found.' });
      return;
    }

    // Idempotent handling for concurrent retries/webhooks
    if (reg.paymentStatus === 'PAID' && reg.registrationStatus === 'CONFIRMED') {
      res.status(200).json({
        success: true,
        message: 'Payment already verified and registration confirmed.',
        registration: reg.toJSON(),
        qrToken: reg.qrToken,
        qrCodeDataUrl: reg.qrCodeDataUrl,
      });
      return;
    }

    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_lakshya2026Key';

    // Check if we're in test mode (placeholder credentials)
    const isTestMode = !process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET === 'your_razorpay_secret_key';

    let isSignatureValid = false;

    if (isTestMode) {
      // In test mode, accept any signature for development
      console.log('[Razorpay] Test mode: skipping signature verification');
      isSignatureValid = true;
    } else {
      // Official Razorpay HMAC-SHA256 signature verification:
      // HMAC(order_id + "|" + payment_id, secret)
      const body = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = crypto
        .createHmac('sha256', key_secret)
        .update(body)
        .digest('hex');

      const expBuf = Buffer.from(expectedSignature, 'utf8');
      const actBuf = Buffer.from(razorpay_signature, 'utf8');
      isSignatureValid = expBuf.length === actBuf.length && crypto.timingSafeEqual(expBuf, actBuf);
    }

    if (!isSignatureValid) {
      await Registration.findByIdAndUpdate(registrationId, { paymentStatus: 'FAILED' });

      res.status(400).json({
        success: false,
        message: 'Payment verification failed: Invalid cryptographic signature. Registration could not be confirmed.',
      });
      return;
    }

    // Generate unique verifiable delegate QR badge
    const qr = await generateRegistrationQR(reg._id.toString(), reg.eventId, reg.studentId);

    // ATOMIC COMPARE-AND-SWAP:
    // Guarantees concurrency safety even if 1000 users or webhooks submit simultaneously
    const updatedReg = await Registration.findOneAndUpdate(
      {
        _id: reg._id,
        paymentStatus: { $ne: 'PAID' },
      },
      {
        $set: {
          paymentId: razorpay_payment_id,
          paymentOrderId: razorpay_order_id,
          paymentSignature: razorpay_signature,
          paymentStatus: 'PAID',
          registrationStatus: 'CONFIRMED',
          qrToken: qr.token,
          qrCodeDataUrl: qr.dataUrl,
        },
      },
      { new: true }
    );

    if (updatedReg) {
      // Exactly ONE concurrent execution wins and increments the event count
      await Event.findByIdAndUpdate(reg.event, { $inc: { registeredCount: 1 } });

      res.status(200).json({
        success: true,
        message: 'Payment verified successfully! Your event registration is confirmed.',
        registration: updatedReg.toJSON(),
        qrToken: qr.token,
        qrCodeDataUrl: qr.dataUrl,
      });
      return;
    }

    // If updatedReg is null, an earlier concurrent call already marked it PAID!
    const confirmedReg = await Registration.findById(registrationId);
    res.status(200).json({
      success: true,
      message: 'Payment already verified and registration confirmed.',
      registration: confirmedReg ? confirmedReg.toJSON() : reg.toJSON(),
      qrToken: confirmedReg?.qrToken || reg.qrToken,
      qrCodeDataUrl: confirmedReg?.qrCodeDataUrl || reg.qrCodeDataUrl,
    });
  } catch (error: any) {
    console.error('[Verify Payment Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Payment verification failed.' });
  }
}

// POST /api/payment/webhook
export async function paymentWebhook(req: Request, res: Response): Promise<void> {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'] as string;

    if (webhookSecret && signature) {
      const shasum = crypto.createHmac('sha256', webhookSecret);
      shasum.update(JSON.stringify(req.body));
      const digest = shasum.digest('hex');

      if (digest !== signature) {
        res.status(400).json({ status: 'invalid_signature' });
        return;
      }
    }

    const event = req.body.event;
    if (event === 'payment.captured') {
      const payment = req.body.payload.payment.entity;
      const orderId = payment.order_id;
      if (orderId) {
        const reg = await Registration.findOne({ paymentOrderId: orderId });
        if (reg) {
          const qr = await generateRegistrationQR(reg._id.toString(), reg.eventId, reg.studentId);
          const updated = await Registration.findOneAndUpdate(
            {
              paymentOrderId: orderId,
              paymentStatus: { $ne: 'PAID' },
            },
            {
              $set: {
                paymentStatus: 'PAID',
                registrationStatus: 'CONFIRMED',
                paymentId: payment.id,
                qrToken: qr.token,
                qrCodeDataUrl: qr.dataUrl,
              },
            },
            { new: true }
          );

          if (updated) {
            await Event.findByIdAndUpdate(reg.event, { $inc: { registeredCount: 1 } });
          }
        }
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (error: any) {
    console.error('[Webhook Error]', error);
    res.status(500).json({ status: 'error' });
  }
}
