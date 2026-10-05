/**
 * Targeted rate limiters for security-sensitive endpoints.
 * Limits are deliberately NAT-friendly (whole campuses often share IPs).
 * Requires `app.set('trust proxy', 1)` so client IPs resolve behind Render.
 */
import rateLimit from 'express-rate-limit';

function jsonHandler(message: string) {
  return (_req: any, res: any) => {
    res.status(429).json({ success: false, message });
  };
}

// Login / signup / password flows
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: jsonHandler('Too many authentication attempts. Please wait 15 minutes and try again.'),
});

// OTP issue endpoints (per-OTP attempt caps in the DB are the primary guard)
export const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: jsonHandler('Too many OTP requests. Please wait 15 minutes and try again.'),
});

// OTP verification endpoints
export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: jsonHandler('Too many verification attempts. Please wait 15 minutes and try again.'),
});

// Registration creation
export const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: jsonHandler('Too many registration attempts. Please wait a few minutes and try again.'),
});

// Payment order creation + verification
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: jsonHandler('Too many payment attempts. Please wait 15 minutes and try again.'),
});
