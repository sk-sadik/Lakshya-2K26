import { Request, Response } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { Registration } from '../models/Registration';
import { Event } from '../models/Event';
import { generateRegistrationQR } from '../services/qrService';
import { AuthenticatedRequest, AuthUser } from '../middleware/auth';
import { getRazorpayConfig } from '../config/env';

function getRazorpayInstance(): Razorpay | null {
  const config = getRazorpayConfig();
  if (!config) {
    return null;
  }
  return new Razorpay({
    key_id: config.keyId,
    key_secret: config.keySecret,
  });
}

/** True when the caller owns the registration (student) or is an admin. */
function canAccessRegistration(reg: any, user: AuthUser | undefined): boolean {
  if (!user) return false;
  const roles: string[] = Array.isArray((user as any).roles)
    ? (user as any).roles
    : [(user as any).role].filter(Boolean);
  if (roles.includes('admin')) return true;
  return String(reg.studentId) === String((user as any)._id);
}

/** True for admin or the coordinator who owns the given event. */
function canAccessEvent(event: any, user: AuthUser | undefined): boolean {
  if (!user) return false;
  const roles: string[] = Array.isArray((user as any).roles)
    ? (user as any).roles
    : [(user as any).role].filter(Boolean);
  if (roles.includes('admin')) return true;
  const userEmail = ((user as any).email || '').toLowerCase().trim();
  return (
    String(event.coordinator || '') === String((user as any)._id) ||
    (event.coordinatorEmail || '').toLowerCase().trim() === userEmail
  );
}

export interface IssuedOrder {
  id: string;
  amount: number;
  currency: string;
  key: string;
}

/**
 * Create a REAL Razorpay order for a registration. Amounts come only from the
 * server-side event record. Throws { status, message } on any failure —
 * callers must leave the registration PENDING and surface a safe error.
 * Never invents order ids.
 */
export async function issueRazorpayOrder(reg: any, event: any): Promise<IssuedOrder> {
  const config = getRazorpayConfig();
  const razorpay = getRazorpayInstance();
  if (!config || !razorpay) {
    console.error('[Razorpay] Order issuance refused: gateway credentials not configured.');
    throw { status: 500, message: 'Payment gateway is not configured. Please contact support.' };
  }
  const amountInPaise = Math.round(event.feeAmount * 100);
  if (amountInPaise <= 0) {
    throw { status: 400, message: 'This event has no registration fee.' };
  }
  try {
    const order: any = await razorpay.orders.create({
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
    console.log(`[Razorpay] Order created successfully: ${order.id}`);
    return { id: order.id, amount: amountInPaise, currency: 'INR', key: config.keyId };
  } catch (err: any) {
    console.error('[Razorpay API Error]', err?.message || err);
    throw { status: 502, message: 'Payment gateway is temporarily unavailable. Your registration is still pending — please try again.' };
  }
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

    // Ownership: students may only create orders for their own registrations.
    // (404 instead of 403 so registration IDs cannot be probed.)
    if (!canAccessRegistration(reg, req.user)) {
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

    // Coordinators may only act on events they own (admins bypass).
    if (!canAccessEvent(event, req.user)) {
      res.status(404).json({ success: false, message: 'Registration record not found.' });
      return;
    }

    // Event must still be payable: approved, open, within deadline, seats left.
    if (event.approvalStatus !== 'approved' || !['upcoming', 'ongoing'].includes(event.status)) {
      res.status(400).json({ success: false, message: 'This event is no longer open for payment.' });
      return;
    }
    if (event.registrationDeadline) {
      const deadline = new Date(event.registrationDeadline);
      if (!isNaN(deadline.getTime()) && new Date() > deadline) {
        res.status(400).json({ success: false, message: 'The payment window for this event has closed.' });
        return;
      }
    }
    if (event.maxParticipants > 0 && event.registeredCount >= event.maxParticipants) {
      res.status(400).json({ success: false, message: 'Event capacity is full. Registrations are closed.' });
      return;
    }

    // Amount ALWAYS comes from the server-side event record, never the client.
    const amountInPaise = Math.round(event.feeAmount * 100);
    if (amountInPaise <= 0) {
      res.status(400).json({ success: false, message: 'This event has no registration fee.' });
      return;
    }

    // Strict issuance: real Razorpay order or a safe error. Never fake order ids.
    let order: IssuedOrder;
    try {
      order = await issueRazorpayOrder(reg, event);
    } catch (err: any) {
      res.status(err?.status || 500).json({ success: false, message: err?.message || 'Failed to create payment order.' });
      return;
    }

    reg.paymentOrderId = order.id;
    reg.paymentAmount = event.feeAmount;
    reg.paymentStatus = 'PENDING';
    await reg.save();

    res.status(200).json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        key: order.key,
        eventName: event.eventName,
        eventFee: event.entryFee,
        studentName: reg.studentName,
        studentEmail: reg.studentEmail,
        studentPhone: reg.studentPhone,
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

    // Ownership: the registration must belong to the logged-in student (admins bypass).
    if (!canAccessRegistration(reg, req.user)) {
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

    // Razorpay order ownership: the supplied order must be THIS registration's order.
    if (!reg.paymentOrderId || razorpay_order_id !== reg.paymentOrderId) {
      res.status(400).json({
        success: false,
        message: 'Payment order does not match this registration. Please create a fresh payment order.',
      });
      return;
    }

    // Real credentials are mandatory — arbitrary signatures are never accepted.
    const razorpayConfig = getRazorpayConfig();
    const razorpay = getRazorpayInstance();
    if (!razorpayConfig || !razorpay) {
      console.error('[Razorpay] Verify refused: gateway credentials not configured.');
      res.status(500).json({ success: false, message: 'Payment gateway is not configured. Please contact support.' });
      return;
    }

    // Official Razorpay HMAC-SHA256 signature verification:
    // HMAC(order_id + "|" + payment_id, key_secret)
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', razorpayConfig.keySecret)
      .update(body)
      .digest('hex');

    const expBuf = Buffer.from(expectedSignature, 'utf8');
    const actBuf = Buffer.from(String(razorpay_signature), 'utf8');
    const isSignatureValid = expBuf.length === actBuf.length && crypto.timingSafeEqual(expBuf, actBuf);

    if (!isSignatureValid) {
      await Registration.findByIdAndUpdate(registrationId, { paymentStatus: 'FAILED' });

      res.status(400).json({
        success: false,
        message: 'Payment verification failed: Invalid cryptographic signature. Registration could not be confirmed.',
      });
      return;
    }

    // Server-side amount/event validation + Razorpay API cross-check.
    // Nothing about the amount is trusted from the client.
    const event = await Event.findById(reg.event);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event details not found.' });
      return;
    }
    const expectedPaise = Math.round(event.feeAmount * 100);
    if (expectedPaise <= 0) {
      res.status(400).json({ success: false, message: 'This event has no registration fee.' });
      return;
    }
    let rzpOrder: any;
    let rzpPayment: any;
    try {
      rzpOrder = await razorpay.orders.fetch(razorpay_order_id);
      rzpPayment = await razorpay.payments.fetch(razorpay_payment_id);
    } catch (err: any) {
      console.error('[Razorpay API Verify Error]', err?.message || err);
      res.status(502).json({ success: false, message: 'Could not confirm the payment with the gateway. Please try again.' });
      return;
    }
    if (
      !rzpOrder || !rzpPayment ||
      String(rzpOrder.id) !== String(razorpay_order_id) ||
      String(rzpPayment.order_id) !== String(razorpay_order_id) ||
      Number(rzpOrder.amount) !== expectedPaise ||
      Number(rzpPayment.amount) !== expectedPaise ||
      (rzpOrder.currency || 'INR').toUpperCase() !== 'INR' ||
      (rzpPayment.currency || 'INR').toUpperCase() !== 'INR' ||
      rzpPayment.status !== 'captured'
    ) {
      await Registration.findByIdAndUpdate(registrationId, { paymentStatus: 'FAILED' });
      res.status(400).json({
        success: false,
        message: 'Payment details do not match this registration (amount, currency, order, or capture status). Registration could not be confirmed.',
      });
      return;
    }

    // Replay guard: this Razorpay payment must not already confirm another registration.
    const reused = await Registration.findOne({
      _id: { $ne: reg._id },
      paymentId: razorpay_payment_id,
      paymentStatus: 'PAID',
    });
    if (reused) {
      res.status(409).json({
        success: false,
        message: 'This payment has already been used for another registration.',
      });
      return;
    }

    // Generate unique verifiable delegate QR badge
    const qr = await generateRegistrationQR(reg._id.toString(), reg.eventId, reg.studentId);

    // ATOMIC COMPARE-AND-SWAP (registration):
    // Exactly one concurrent execution can move this registration to PAID.
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
          paymentAmount: event.feeAmount,
          registrationStatus: 'CONFIRMED',
          qrToken: qr.token,
          qrCodeDataUrl: qr.dataUrl,
        },
      },
      { new: true }
    );

    if (!updatedReg) {
      // An earlier concurrent call already marked it PAID.
      const confirmedReg = await Registration.findById(registrationId);
      res.status(200).json({
        success: true,
        message: 'Payment already verified and registration confirmed.',
        registration: confirmedReg ? confirmedReg.toJSON() : reg.toJSON(),
        qrToken: confirmedReg?.qrToken || reg.qrToken,
        qrCodeDataUrl: confirmedReg?.qrCodeDataUrl || reg.qrCodeDataUrl,
      });
      return;
    }

    // ATOMIC CAPACITY CHECK + COUNT (prevents paid-event overselling):
    // the seat is claimed only if capacity is still available.
    const capped = event.maxParticipants > 0;
    const seatClaim = capped
      ? await Event.findOneAndUpdate(
          {
            _id: event._id,
            $expr: { $lt: ['$registeredCount', '$maxParticipants'] },
          },
          { $inc: { registeredCount: 1 } },
          { new: true }
        )
      : await Event.findByIdAndUpdate(event._id, { $inc: { registeredCount: 1 } }, { new: true });

    if (seatClaim) {
      res.status(200).json({
        success: true,
        message: 'Payment verified successfully! Your event registration is confirmed.',
        registration: updatedReg.toJSON(),
        qrToken: qr.token,
        qrCodeDataUrl: qr.dataUrl,
      });
      return;
    }

    // Capacity filled between order and confirmation: do NOT confirm.
    // Attempt an automatic refund of the captured payment (best effort).
    let refundNote = 'No seat was available, so this registration was NOT confirmed.';
    try {
      const refund = await razorpay.payments.refund(razorpay_payment_id, { amount: expectedPaise });
      refundNote += ` An automatic refund (${(refund as any)?.id || 'initiated'}) has been started to the original payment method.`;
      await Registration.findByIdAndUpdate(reg._id, {
        registrationStatus: 'CANCELLED',
        paymentStatus: 'CANCELLED',
      });
    } catch (refundErr: any) {
      console.error('[Razorpay Auto-Refund Error]', refundErr?.message || refundErr);
      refundNote += ' Automatic refund failed — please contact support with payment id ' + razorpay_payment_id + ' for a manual refund.';
      await Registration.findByIdAndUpdate(reg._id, { registrationStatus: 'CANCELLED' });
    }
    res.status(409).json({ success: false, message: `Event capacity just filled. ${refundNote}` });
  } catch (error: any) {
    console.error('[Verify Payment Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Payment verification failed.' });
  }
}

// POST /api/payment/webhook
// FAIL-CLOSED: the request is rejected unless the webhook secret is configured,
// a signature is present and valid (HMAC-SHA256 over the RAW request body),
// and the payload parses. Only then is anything processed.
//
// Handled events (everything else is logged + acknowledged):
// - payment.captured / order.paid -> confirm the matching registration (idempotent)
// - payment.failed            -> mark a still-PENDING registration FAILED (never touches PAID/CONFIRMED)
export async function paymentWebhook(req: Request, res: Response): Promise<void> {
  try {
    const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
    if (!webhookSecret) {
      console.error('[Webhook] Rejected: RAZORPAY_WEBHOOK_SECRET is not configured.');
      res.status(500).json({ status: 'config_error' });
      return;
    }

    const signature = req.headers['x-razorpay-signature'];
    if (!signature || typeof signature !== 'string' || signature.length === 0) {
      console.warn('[Webhook] Rejected: missing x-razorpay-signature header.');
      res.status(400).json({ status: 'missing_signature' });
      return;
    }

    // The route MUST receive the raw body (express.raw). Never verify against
    // a re-serialized object — key order/whitespace would break the HMAC.
    if (!Buffer.isBuffer(req.body)) {
      console.error('[Webhook] Rejected: raw request body unavailable.');
      res.status(400).json({ status: 'raw_body_required' });
      return;
    }
    const rawBody: Buffer = req.body;

    const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    const expBuf = Buffer.from(expected, 'utf8');
    const actBuf = Buffer.from(signature, 'utf8');
    if (expBuf.length !== actBuf.length || !crypto.timingSafeEqual(expBuf, actBuf)) {
      console.warn('[Webhook] Rejected: invalid signature.');
      res.status(400).json({ status: 'invalid_signature' });
      return;
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      console.warn('[Webhook] Rejected: malformed JSON payload.');
      res.status(400).json({ status: 'malformed_payload' });
      return;
    }

    // Signature is valid from here on — process the event.
    const event = payload?.event;
    if (event === 'payment.captured' || event === 'order.paid') {
      const entity = event === 'payment.captured' ? payload?.payload?.payment?.entity : payload?.payload?.order?.entity;
      // order.paid carries the order entity (no payment id); payment.captured carries the payment entity.
      const orderId =
        event === 'payment.captured'
          ? typeof entity?.order_id === 'string'
            ? entity.order_id
            : null
          : typeof entity?.id === 'string'
            ? entity.id
            : null;
      const paymentId =
        event === 'payment.captured' && typeof entity?.id === 'string' ? entity.id : null;
      const capturedOk =
        event === 'order.paid'
          ? entity?.status === 'paid' || typeof entity?.amount_paid === 'number'
          : entity?.status === 'captured';
      console.log(`[Webhook] event=${event} order=${orderId || 'n/a'} payment=${paymentId || 'n/a'} sig=valid`);
      if (!orderId) {
        res.status(200).json({ status: 'ok' });
        return;
      }
      if (event === 'payment.captured' && !capturedOk) {
        console.log(`[Webhook] payment not captured (status=${entity?.status}); ignoring order=${orderId}.`);
        res.status(200).json({ status: 'ok' });
        return;
      }
      const outcome = await confirmRegistrationForOrder(orderId, paymentId, event);
      console.log(`[Webhook] ${event} order=${orderId} outcome=${outcome}.`);
      res.status(200).json({ status: 'ok' });
      return;
    }

    if (event === 'payment.failed') {
      const entity = payload?.payload?.payment?.entity;
      const orderId = typeof entity?.order_id === 'string' ? entity.order_id : null;
      console.log(`[Webhook] event=payment.failed order=${orderId || 'n/a'} sig=valid`);
      if (orderId) {
        // Only flip still-PENDING registrations; PAID/CONFIRMED are never touched.
        const flipped = await Registration.findOneAndUpdate(
          { paymentOrderId: orderId, paymentStatus: 'PENDING', registrationStatus: 'PENDING' },
          { $set: { paymentStatus: 'FAILED' } },
          { new: true }
        );
        console.log(
          flipped
            ? `[Webhook] payment.failed order=${orderId}: registration marked FAILED.`
            : `[Webhook] payment.failed order=${orderId}: no pending registration found, nothing changed.`
        );
      }
      res.status(200).json({ status: 'ok' });
      return;
    }

    console.log(`[Webhook] Ignoring unhandled event type: ${event}.`);
    res.status(200).json({ status: 'ok' });
  } catch (error: any) {
    console.error('[Webhook Error]', error?.message || error);
    res.status(500).json({ status: 'error' });
  }
}

/**
 * Shared idempotent confirm used by payment.captured AND order.paid.
 * Finds the registration by stored order id, flips it to PAID/CONFIRMED exactly
 * once (compare-and-swap), generates the QR badge, and claims one seat behind
 * a capacity gate. Repeat deliveries change nothing (no double count, no dupes).
 */
async function confirmRegistrationForOrder(
  orderId: string,
  paymentId: string | null,
  source: string
): Promise<'confirmed' | 'already' | 'unknown-order'> {
  const reg = await Registration.findOne({ paymentOrderId: orderId });
  if (!reg) {
    // Unknown order: caller acknowledges so Razorpay stops retrying; nothing changes.
    console.log(`[Webhook] ${source} order=${orderId}: no matching registration, ignoring.`);
    return 'unknown-order';
  }

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
        paymentId: paymentId || reg.paymentId,
        qrToken: qr.token,
        qrCodeDataUrl: qr.dataUrl,
      },
    },
    { new: true }
  );

  if (!updated) {
    console.log(`[Webhook] ${source} order=${orderId}: already PAID, skipping (idempotent).`);
    return 'already';
  }

  // Capacity-gated increment, mirroring verifyPayment.
  const eventDoc = await Event.findById(reg.event);
  const capped = !!eventDoc && eventDoc.maxParticipants > 0;
  if (!capped) {
    await Event.findByIdAndUpdate(reg.event, { $inc: { registeredCount: 1 } });
  } else {
    await Event.findOneAndUpdate(
      {
        _id: reg.event,
        $expr: { $lt: ['$registeredCount', '$maxParticipants'] },
      },
      { $inc: { registeredCount: 1 } }
    );
  }
  console.log(`[Webhook] ${source} order=${orderId}: registration CONFIRMED.`);
  return 'confirmed';
}
