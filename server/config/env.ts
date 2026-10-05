/**
 * Centralized environment configuration.
 *
 * - Production fails fast when required secrets are missing or weak.
 * - Development logs warnings and uses explicitly safe fallbacks (an
 *   ephemeral random JWT secret — never a hardcoded/predictable one).
 * - Secret VALUES are never logged here.
 */
import crypto from 'crypto';

export const isProduction = process.env.NODE_ENV === 'production';

const MIN_JWT_SECRET_LENGTH = 32;

let cachedDevSecret: string | null = null;

/** Resolve the JWT secret. Throws in production when missing/weak. */
export function getJwtSecret(): string {
  const configured = (process.env.JWT_SECRET || '').trim();
  if (configured) {
    if (configured.length < MIN_JWT_SECRET_LENGTH) {
      if (isProduction) {
        throw new Error(
          `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters in production.`
        );
      }
      console.warn('[Env] JWT_SECRET is short; development only — use a strong secret.');
    }
    return configured;
  }
  if (isProduction) {
    throw new Error('JWT_SECRET is required in production.');
  }
  // Development-only: ephemeral random secret (old dev tokens invalidate on restart).
  if (!cachedDevSecret) {
    cachedDevSecret = crypto.randomBytes(64).toString('hex');
    console.warn('[Env] JWT_SECRET not set — using an ephemeral development secret.');
  }
  return cachedDevSecret;
}

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
}

const PLACEHOLDERS = new Set([
  '',
  'rzp_test_your_key_id',
  'your_razorpay_secret_key',
  'your_webhook_secret_optional',
]);

/** Razorpay credentials, or null when not (fully) configured. */
export function getRazorpayConfig(): RazorpayConfig | null {
  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
  if (!keyId || !keySecret || PLACEHOLDERS.has(keyId) || PLACEHOLDERS.has(keySecret)) {
    return null;
  }
  return { keyId, keySecret, webhookSecret };
}

/** True when payment verification can actually run (real Razorpay secret present). */
export function isPaymentsConfigured(): boolean {
  return getRazorpayConfig() !== null;
}

/**
 * Fail fast in production when required secrets are missing.
 * Call once during server startup, before listening.
 */
export function validateProductionEnv(): void {
  if (!isProduction) {
    if (!process.env.MONGODB_URI) {
      console.warn('[Env] MONGODB_URI not set — using local development database.');
    }
    // Resolve (and warn about) the dev JWT secret eagerly.
    getJwtSecret();
    if (!isPaymentsConfigured()) {
      console.warn('[Env] Razorpay credentials not configured — payment order/verify endpoints will reject with a clear error.');
    }
    if (!process.env.RAZORPAY_WEBHOOK_SECRET?.trim()) {
      console.warn('[Env] RAZORPAY_WEBHOOK_SECRET not set — webhooks will be rejected.');
    }
    return;
  }

  const missing: string[] = [];
  if (!process.env.MONGODB_URI?.trim()) missing.push('MONGODB_URI');
  if (!process.env.RAZORPAY_KEY_ID?.trim()) missing.push('RAZORPAY_KEY_ID');
  if (!process.env.RAZORPAY_KEY_SECRET?.trim()) missing.push('RAZORPAY_KEY_SECRET');
  if (!process.env.RAZORPAY_WEBHOOK_SECRET?.trim()) missing.push('RAZORPAY_WEBHOOK_SECRET');
  const emailOk =
    !!process.env.BREVO_API_KEY?.trim() ||
    (!!process.env.EMAIL_USER?.trim() && !!process.env.EMAIL_PASSWORD?.trim());
  if (!emailOk) missing.push('BREVO_API_KEY or EMAIL_USER+EMAIL_PASSWORD');

  // JWT_SECRET validated (presence + length) by getJwtSecret.
  try {
    getJwtSecret();
  } catch (err: any) {
    missing.push(`JWT_SECRET (${err.message})`);
  }

  if (missing.length > 0) {
    throw new Error(`Missing required production configuration: ${missing.join(', ')}. Refusing to start.`);
  }
  console.log('[Env] Production configuration validated.');
}
