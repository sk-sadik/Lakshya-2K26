import nodemailer from 'nodemailer';

export interface SendOTPOptions {
  to: string;
  name?: string;
  otp: string;
  purpose: 'verification' | 'reset' | 'change_password';
}

export interface SendFoodCouponOptions {
  to: string;
  name: string;
  couponCode: string;
  mealType: string;
  mealDescription: string;
  venue: string;
  expiryDate: Date | string;
  qrCodeDataUrl?: string;
}

export function createTransporter() {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT || '587', 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  if (user && pass && pass !== 'your_email_app_password' && pass !== 'lakshya_app_password_placeholder') {
    // Standard Gmail or custom SMTP transporter.
    // Timeouts keep slow/unreachable SMTP relays (common from cloud hosts)
    // from hanging API responses.
    if (host.includes('gmail') || user.includes('@gmail.com')) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user,
          pass,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  return null;
}

// Fire-and-forget OTP dispatch: logs success/failure but never blocks the API response.
export function sendOTPEmailInBackground(options: SendOTPOptions): void {
  sendOTPEmail(options).then(
    (result) => {
      if (!result.success) {
        console.error(`[EmailService] Background OTP send failed for ${options.to}:`, result.error);
      }
    },
    (err) => {
      console.error(`[EmailService] Background OTP send crashed for ${options.to}:`, err?.message || err);
    }
  );
}

// Brevo HTTPS API delivery (port 443 — works from hosts that block SMTP ports,
// e.g. Render free tier). Enabled by setting BREVO_API_KEY. Takes precedence
// over SMTP whenever the key is present.
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

function parseSender(from: string, fallbackEmail: string): { name: string; email: string } {
  const match = from.match(/^(.*)<([^>]+)>\s*$/);
  if (match) {
    return { name: match[1].trim().replace(/^"|"$/g, '') || 'LBRCE Lakshya 2026', email: match[2].trim() || fallbackEmail };
  }
  return { name: 'LBRCE Lakshya 2026', email: from.includes('@') ? from.trim() : fallbackEmail };
}

async function sendViaBrevoHttpApi(options: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'BREVO_API_KEY not configured.' };
  }
  const sender = parseSender(
    options.from || process.env.EMAIL_FROM || '',
    process.env.EMAIL_USER || 'fest@lbrce.ac.in'
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender,
        to: [{ email: options.to }],
        subject: options.subject,
        htmlContent: options.html,
      }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: (data as any)?.message || `Brevo API error ${res.status}.` };
    }
    return { success: true, messageId: (data as any)?.messageId };
  } catch (err: any) {
    const msg = err?.name === 'AbortError' ? 'Brevo API request timed out.' : err?.message || 'Brevo API failure.';
    return { success: false, error: msg };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendOTPEmail(options: SendOTPOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to, name, otp, purpose } = options;
  const from = process.env.EMAIL_FROM || `"LBRCE Lakshya 2026" <${process.env.EMAIL_USER || 'fest@lbrce.ac.in'}>`;

  const subjectMap = {
    verification: 'Verify Your Email — LBRCE Lakshya 2026',
    reset: 'Password Reset OTP — LBRCE Lakshya 2026',
    change_password: 'Security Verification OTP — LBRCE Lakshya 2026',
  };

  const titleMap = {
    verification: 'Email Verification Code',
    reset: 'Password Reset Verification',
    change_password: 'Change Password Verification',
  };

  const descMap = {
    verification: 'Thank you for registering for Lakshya 2026 National Level Symposium. Use the 6-digit OTP below to verify your email address and activate your account.',
    reset: 'We received a request to reset the password for your Lakshya 2026 account. Use the 6-digit OTP below to proceed.',
    change_password: 'A request was made to update your account password. Confirm this action with the 6-digit security OTP below.',
  };

  const subject = subjectMap[purpose] || 'Lakshya 2026 Verification OTP';
  const title = titleMap[purpose] || 'One-Time Passcode';
  const desc = descMap[purpose] || 'Your requested verification code is below:';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #060312; color: #ffffff; margin: 0; padding: 24px; }
        .container { max-width: 540px; margin: 0 auto; background: #0f0a24; border: 1px solid #7928ca; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
        .header { background: linear-gradient(135deg, #4f46e5 0%, #ec4899 100%); padding: 28px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 2px; color: #ffffff; text-transform: uppercase; }
        .header p { margin: 6px 0 0; font-size: 13px; color: #fdf2f8; font-weight: 500; }
        .content { padding: 32px 24px; text-align: center; }
        .greeting { font-size: 16px; font-weight: 600; color: #f1f5f9; margin-bottom: 12px; text-align: left; }
        .text { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; text-align: left; }
        .otp-box { background: #1a103c; border: 2px dashed #ec4899; border-radius: 14px; padding: 20px 32px; display: inline-block; margin: 8px 0 24px 0; }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #38bdf8; margin: 0; }
        .expiry { font-size: 13px; font-weight: 600; color: #f43f5e; margin-bottom: 24px; background: rgba(244, 63, 94, 0.1); padding: 10px 16px; border-radius: 8px; border: 1px solid rgba(244, 63, 94, 0.2); }
        .security-note { font-size: 12px; color: #64748b; line-height: 1.5; text-align: left; background: #0c0820; padding: 12px 16px; border-radius: 8px; border-left: 3px solid #38bdf8; }
        .footer { border-top: 1px solid #2e1065; padding: 18px 24px; text-align: center; font-size: 11px; color: #64748b; background: #090518; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Lakshya 2026</h1>
          <p>Lakireddy Bali Reddy College of Engineering (Autonomous)</p>
        </div>
        <div class="content">
          <div class="greeting">Hello ${name || 'Participant'},</div>
          <p class="text">${desc}</p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          <div class="expiry">⏱️ This OTP is valid strictly for 5 minutes and can only be used once.</div>
          <div class="security-note">
            <strong>Security Notice:</strong> Never share this code with anyone. Lakshya fest coordinators will never ask for your verification code or password.
          </div>
        </div>
        <div class="footer">
          &copy; 2026 LBRCE Lakshya Fest Committee. Mylavaram, Krishna Dist, Andhra Pradesh - 521230.<br/>
          This is an automated security transmission. Do not reply directly to this email.
        </div>
      </div>
    </body>
    </html>
  `;

  const transporter = createTransporter();

  if (!transporter) {
    const errorMsg = 'SMTP credentials not properly configured in .env (EMAIL_USER or EMAIL_PASSWORD missing).';
    console.error(`[EmailService] ${errorMsg}`);
    return { success: false, error: errorMsg };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
    console.log(`[EmailService] OTP sent successfully to ${to}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[EmailService] Failed to send email via SMTP to ${to}:`, err);
    // Fall back to Brevo HTTPS API when SMTP fails (e.g. blocked SMTP ports on cloud hosts)
    if (process.env.BREVO_API_KEY) {
      console.log(`[EmailService] Retrying OTP send via Brevo API for ${to}...`);
      return sendViaBrevoHttpApi({ to, subject, html, from });
    }
    return { success: false, error: err.message || 'SMTP transmission failure.' };
  }
}

export async function sendFoodCouponEmail(options: SendFoodCouponOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to, name, couponCode, mealType, mealDescription, venue, expiryDate, qrCodeDataUrl } = options;
  const from = process.env.EMAIL_FROM || `"LBRCE Lakshya 2026" <${process.env.EMAIL_USER || 'fest@lbrce.ac.in'}>`;
  const formattedExpiry = new Date(expiryDate).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const subject = `🍽️ Lakshya 2026 Official Food Pass — ${couponCode}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Lakshya 2026 Food Coupon Pass</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #060312; color: #ffffff; margin: 0; padding: 24px; }
        .container { max-width: 580px; margin: 0 auto; background: #0e0a26; border: 1px solid #059669; border-radius: 20px; overflow: hidden; box-shadow: 0 24px 48px rgba(0,0,0,0.7); }
        .header { background: linear-gradient(135deg, #059669 0%, #0284c7 50%, #7c3aed 100%); padding: 28px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 2px; color: #ffffff; text-transform: uppercase; }
        .header p { margin: 6px 0 0; font-size: 13px; color: #e0f2fe; font-weight: 500; }
        .badge { display: inline-block; background: rgba(255,255,255,0.2); backdrop-filter: blur(8px); padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; color: #ffffff; margin-top: 10px; border: 1px solid rgba(255,255,255,0.3); }
        .content { padding: 32px 24px; text-align: center; }
        .greeting { font-size: 18px; font-weight: 700; color: #f8fafc; margin-bottom: 8px; text-align: left; }
        .subtitle { font-size: 14px; color: #94a3b8; margin-bottom: 24px; text-align: left; line-height: 1.5; }
        
        .coupon-card { background: #16103a; border: 2px solid #10b981; border-radius: 16px; padding: 24px; margin-bottom: 24px; text-align: center; }
        .coupon-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #34d399; margin-bottom: 8px; }
        .coupon-code { font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 900; letter-spacing: 4px; color: #ffffff; margin: 0 0 16px 0; background: #0c0822; padding: 12px 18px; border-radius: 10px; display: inline-block; border: 1px dashed #10b981; }
        
        .meal-info { background: #0f0c2a; border-radius: 12px; padding: 16px; margin: 16px 0; text-align: left; border: 1px solid #272054; }
        .meal-title { font-size: 15px; font-weight: 700; color: #38bdf8; margin-bottom: 4px; }
        .meal-desc { font-size: 13px; color: #cbd5e1; line-height: 1.5; margin-bottom: 12px; }
        .detail-row { font-size: 12px; color: #94a3b8; margin-bottom: 6px; display: flex; justify-content: space-between; }
        .detail-value { color: #f1f5f9; font-weight: 600; }
        
        .qr-section { margin: 20px 0; }
        .qr-img { width: 160px; height: 160px; background: #ffffff; padding: 8px; border-radius: 12px; display: inline-block; border: 2px solid #10b981; }
        .qr-caption { font-size: 12px; color: #94a3b8; margin-top: 8px; }

        .instructions { background: #071727; border-left: 4px solid #0284c7; padding: 14px 18px; border-radius: 8px; text-align: left; margin-bottom: 24px; font-size: 12px; color: #bae6fd; line-height: 1.6; }
        .instructions strong { color: #ffffff; }

        .footer { border-top: 1px solid #1e1b4b; padding: 18px 24px; text-align: center; font-size: 11px; color: #64748b; background: #090518; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Lakshya 2026</h1>
          <p>Lakireddy Bali Reddy College of Engineering (Autonomous)</p>
          <span class="badge">OFFICIAL DINING PASS</span>
        </div>
        <div class="content">
          <div class="greeting">Greetings, ${name}!</div>
          <div class="subtitle">Here is your verified complimentary food and refreshments pass for the Lakshya 2026 National Level Symposium.</div>

          <div class="coupon-card">
            <div class="coupon-label">UNIQUE FOOD COUPON CODE</div>
            <div class="coupon-code">${couponCode}</div>

            <div class="meal-info">
              <div class="meal-title">🍴 ${mealType}</div>
              <div class="meal-desc">${mealDescription}</div>
              <div class="detail-row">
                <span>📍 Venue:</span>
                <span class="detail-value">${venue}</span>
              </div>
              <div class="detail-row">
                <span>⏳ Valid Until:</span>
                <span class="detail-value">${formattedExpiry}</span>
              </div>
              <div class="detail-row">
                <span>🎟️ Pass Status:</span>
                <span class="detail-value" style="color: #34d399;">ACTIVE (Single-Use Only)</span>
              </div>
            </div>

            ${
              qrCodeDataUrl
                ? `
              <div class="qr-section">
                <img class="qr-img" src="${qrCodeDataUrl}" alt="Food Coupon QR Code" />
                <div class="qr-caption">Scan this QR code at the dining hall counter for instant redemption</div>
              </div>`
                : ''
            }
          </div>

          <div class="instructions">
            <strong>Usage & Redemption Instructions:</strong><br/>
            1. Present this digital pass (or printout) at the dining hall entrance counters.<br/>
            2. Our volunteers will scan the QR code or enter the coupon code into the verification system.<br/>
            3. Each coupon is single-use only. Once scanned and redeemed, it cannot be reused.
          </div>
        </div>
        <div class="footer">
          &copy; 2026 LBRCE Lakshya Hospitality Committee. Mylavaram, Krishna Dist, AP - 521230.<br/>
          This pass is issued exclusively for registered Lakshya 2026 attendees. Non-transferable.
        </div>
      </div>
    </body>
    </html>
  `;

  const transporter = createTransporter();

  if (!transporter) {
    const errorMsg = 'SMTP credentials not properly configured in .env (EMAIL_USER or EMAIL_PASSWORD missing).';
    console.error(`[EmailService] ${errorMsg}`);
    return { success: false, error: errorMsg };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
    console.log(`[EmailService] Food coupon email sent successfully to ${to}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[EmailService] Failed to send food coupon email to ${to}:`, err);
    // Fall back to Brevo HTTPS API when SMTP fails (e.g. blocked SMTP ports on cloud hosts)
    if (process.env.BREVO_API_KEY) {
      console.log(`[EmailService] Retrying food coupon send via Brevo API for ${to}...`);
      return sendViaBrevoHttpApi({ to, subject, html, from });
    }
    return { success: false, error: err.message || 'SMTP transmission failure.' };
  }
}
