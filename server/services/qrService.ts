import QRCode from 'qrcode';
import crypto from 'crypto';

export interface QRTokenPayload {
  token: string;
  dataUrl: string;
}

/**
 * Generates a unique, cryptographically-secure registration pass token and QR Code Data URL.
 * Contains only verification metadata (Token, Event ID, Student ID, timestamp hash),
 * strictly excluding any passwords, secrets, or OTPs.
 */
export async function generateRegistrationQR(registrationId: string, eventId: string, studentId: string): Promise<QRTokenPayload> {
  const salt = crypto.randomBytes(6).toString('hex').toUpperCase();
  const token = `LAKSHYA-${registrationId.slice(-6).toUpperCase()}-${salt}`;

  // Structured verification payload for turnstile scanners
  const qrContent = JSON.stringify({
    sys: 'LAKSHYA-2026',
    token,
    regId: registrationId,
    evtId: eventId,
    stdId: studentId,
    v: 1,
  });

  const dataUrl = await QRCode.toDataURL(qrContent, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    margin: 2,
    color: {
      dark: '#0f0a24',
      light: '#ffffff',
    },
    width: 320,
  });

  return { token, dataUrl };
}
