import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User, IUser, UserRole } from '../models/User';
import { Coordinator, ICoordinator } from '../models/Coordinator';
import { OTP } from '../models/OTP';
import { sendOTPEmailInBackground } from '../services/emailService';
import { AuthenticatedRequest, AuthUser } from '../middleware/auth';
import { getJwtSecret } from '../config/env';

function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(`lakshya_otp_${otp}`).digest('hex');
}

function generateToken(user: AuthUser): string {
  const userRoles = Array.isArray((user as any).roles) ? (user as any).roles : [(user as any).role];

  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      roles: userRoles,
    },
    getJwtSecret(),
    { expiresIn: '7d', algorithm: 'HS256' }
  );
}

// POST /api/auth/register
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password, college, department, phone, rollNo, role } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    let existingUser = await User.findOne({ email: normalizedEmail });
    
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    let newUser;
    if (existingUser) {
      // Add role to existing user
      const newRole = (role as UserRole) || 'student';
      if (!existingUser.roles.includes(newRole)) {
        existingUser.roles.push(newRole);
        await existingUser.save();
      }
      newUser = existingUser;
    } else {
      // Create new user with role
      newUser = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        roles: [(role as UserRole) || 'student'],
        college: college || 'Lakireddy Bali Reddy College of Engineering (Autonomous)',
        department: department || 'cse',
        phone,
        rollNo,
        isEmailVerified: false,
      });
    }

    // Generate and send cryptographically secure OTP for email verification (5 min expiry)
    const rawOTP = crypto.randomInt(100000, 1000000).toString();
    const otpHash = hashOTP(rawOTP);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OTP.deleteMany({ email: normalizedEmail, purpose: 'EMAIL_VERIFY' });
    await OTP.create({
      email: normalizedEmail,
      otpHash,
      purpose: 'EMAIL_VERIFY',
      expiresAt,
      attempts: 0,
    });

    // Dispatch OTP email in the background so signup responds instantly
    // even when the SMTP relay is slow (common from cloud hosts).
    sendOTPEmailInBackground({
      to: normalizedEmail,
      name: newUser.name,
      otp: rawOTP,
      purpose: 'verification',
    });

    const token = generateToken(newUser);

    const message = existingUser 
      ? `Role '${role}' added to your existing account!` 
      : 'Account created successfully! Please check your email for OTP verification.';

    res.status(existingUser ? 200 : 201).json({
      success: true,
      message,
      token,
      user: newUser.toJSON(),
    });
  } catch (error: any) {
    console.error('[Register Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Server error during registration.' });
  }
}

// POST /api/auth/verify-email
export async function verifyEmail(req: Request, res: Response): Promise<void> {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ success: false, message: 'Email and 6-digit OTP are required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanOTP = otp.toString().trim();

    const otpRecord = await OTP.findOne({ email: normalizedEmail, purpose: 'EMAIL_VERIFY' });

    if (!otpRecord) {
      res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please request a new code.' });
      return;
    }

    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      res.status(400).json({ success: false, message: 'OTP has expired. Please request a new verification code.' });
      return;
    }

    if (otpRecord.attempts >= 5) {
      await OTP.deleteOne({ _id: otpRecord._id });
      res.status(429).json({ success: false, message: 'Too many incorrect attempts. Please request a new OTP.' });
      return;
    }

    const computedHash = hashOTP(cleanOTP);
    if (computedHash !== otpRecord.otpHash) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      const remaining = 5 - otpRecord.attempts;
      res.status(400).json({
        success: false,
        message: `Incorrect OTP. ${remaining} attempt(s) remaining.`,
      });
      return;
    }

    // OTP verified successfully!
    await OTP.deleteOne({ _id: otpRecord._id });

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.status(404).json({ success: false, message: 'User record not found.' });
      return;
    }

    user.isEmailVerified = true;
    await user.save();

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! Your account is now active.',
      token,
      user: user.toJSON(),
    });
  } catch (error: any) {
    console.error('[Verify Email Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Error verifying email.' });
  }
}

// POST /api/auth/resend-otp
export async function resendOTP(req: Request, res: Response): Promise<void> {
  try {
    const { email, purpose } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: 'Email is required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.status(404).json({ success: false, message: 'Account not found with this email.' });
      return;
    }

    const validPurpose = purpose === 'PASSWORD_RESET' ? 'PASSWORD_RESET' : 'EMAIL_VERIFY';

    // Rate limit check: avoid spamming OTPs within 60s cooldown
    const existingOTP = await OTP.findOne({ email: normalizedEmail, purpose: validPurpose });
    if (existingOTP && Date.now() - existingOTP.createdAt.getTime() < 60 * 1000) {
      const waitSeconds = Math.ceil((60 * 1000 - (Date.now() - existingOTP.createdAt.getTime())) / 1000);
      res.status(429).json({ success: false, message: `Please wait ${waitSeconds}s before requesting another OTP.` });
      return;
    }

    await OTP.deleteMany({ email: normalizedEmail, purpose: validPurpose });

    const rawOTP = crypto.randomInt(100000, 1000000).toString();
    const otpHash = hashOTP(rawOTP);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    try {
      await OTP.create({
        email: normalizedEmail,
        otpHash,
        purpose: validPurpose,
        expiresAt,
        attempts: 0,
      });

      // Respond immediately; email continues in the background.
      sendOTPEmailInBackground({
        to: normalizedEmail,
        name: user.name,
        otp: rawOTP,
        purpose: validPurpose === 'PASSWORD_RESET' ? 'reset' : 'verification',
      });

      res.status(200).json({ success: true, message: 'A new 6-digit OTP code has been sent to your email.' });
    } catch (otpError) {
      console.error('[OTP Generation Error]', otpError);
      res.status(500).json({ success: false, message: 'Failed to generate and send OTP. Please try again.' });
    }
  } catch (error: any) {
    console.error('[Resend OTP Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Error resending OTP.' });
  }
}

// POST /api/auth/login
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Please provide both email and password.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Try to find user first, then coordinator
    let user: AuthUser | null = await User.findOne({ email: normalizedEmail }).select('+passwordHash') as AuthUser;
    if (!user) {
      user = await Coordinator.findOne({ email: normalizedEmail }).select('+passwordHash') as AuthUser;
    }

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials. Account not found.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid password. Please check your credentials.' });
      return;
    }

    if (user.status === 'disabled') {
      res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact support.' });
      return;
    }

    const userRoles = Array.isArray((user as any).roles) ? (user as any).roles : [(user as any).role || 'student'];

    // If specific role requested, verify user has that access type
    if (role && !userRoles.includes(role)) {
      res.status(403).json({
        success: false,
        message: `Your account does not have '${role}' access privileges. Available roles: ${userRoles.join(', ')}.`,
      });
      return;
    }

    const token = generateToken(user);
    const userJson = user.toJSON();
    if (role && userRoles.includes(role)) {
      userJson.role = role;
    }

    res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: userJson,
    });
  } catch (error: any) {
    console.error('[Login Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Login failed.' });
  }
}

// POST /api/auth/forgot-password
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: 'Please provide your registered email address.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      // Generic response for security or clear guidance
      res.status(404).json({ success: false, message: 'No registered account found with that email address.' });
      return;
    }

    // Rate limit check: 60s cooldown for forgot password OTP
    const existingOTP = await OTP.findOne({ email: normalizedEmail, purpose: 'PASSWORD_RESET' });
    if (existingOTP && Date.now() - existingOTP.createdAt.getTime() < 60 * 1000) {
      const waitSeconds = Math.ceil((60 * 1000 - (Date.now() - existingOTP.createdAt.getTime())) / 1000);
      res.status(429).json({ success: false, message: `Please wait ${waitSeconds}s before requesting another reset OTP.` });
      return;
    }

    await OTP.deleteMany({ email: normalizedEmail, purpose: 'PASSWORD_RESET' });

    const rawOTP = crypto.randomInt(100000, 1000000).toString();
    const otpHash = hashOTP(rawOTP);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    try {
      await OTP.create({
        email: normalizedEmail,
        otpHash,
        purpose: 'PASSWORD_RESET',
        expiresAt,
        attempts: 0,
      });

      // Respond immediately; email continues in the background.
      sendOTPEmailInBackground({
        to: normalizedEmail,
        name: user.name,
        otp: rawOTP,
        purpose: 'reset',
      });

      res.status(200).json({
        success: true,
        message: 'A 6-digit password reset OTP has been sent to your registered email.',
        email: normalizedEmail,
      });
    } catch (otpError) {
      console.error('[OTP Generation Error]', otpError);
      res.status(500).json({ success: false, message: 'Failed to generate and send OTP. Please try again.' });
    }
  } catch (error: any) {
    console.error('[Forgot Password Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Error processing forgot password.' });
  }
}

// POST /api/auth/verify-reset-otp
export async function verifyResetOTP(req: Request, res: Response): Promise<void> {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ success: false, message: 'Email and OTP code are required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanOTP = otp.toString().trim();

    const otpRecord = await OTP.findOne({ email: normalizedEmail, purpose: 'PASSWORD_RESET' });
    if (!otpRecord) {
      res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please request a new reset code.' });
      return;
    }

    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      res.status(400).json({ success: false, message: 'OTP has expired.' });
      return;
    }

    if (otpRecord.attempts >= 5) {
      await OTP.deleteOne({ _id: otpRecord._id });
      res.status(429).json({ success: false, message: 'Too many incorrect attempts. Please request a new code.' });
      return;
    }

    const computedHash = hashOTP(cleanOTP);
    if (computedHash !== otpRecord.otpHash) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      res.status(400).json({ success: false, message: 'Incorrect OTP code.' });
      return;
    }

    res.status(200).json({ success: true, message: 'OTP verified successfully. You may now reset your password.' });
  } catch (error: any) {
    console.error('[Verify Reset OTP Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Error verifying reset OTP.' });
  }
}

// POST /api/auth/reset-password
export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      res.status(400).json({ success: false, message: 'Email, OTP, and new password are required.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanOTP = otp.toString().trim();

    const otpRecord = await OTP.findOne({ email: normalizedEmail, purpose: 'PASSWORD_RESET' });
    if (!otpRecord) {
      res.status(400).json({ success: false, message: 'Invalid or expired password reset session.' });
      return;
    }

    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      res.status(400).json({ success: false, message: 'Reset OTP has expired. Please start again.' });
      return;
    }

    const computedHash = hashOTP(cleanOTP);
    if (computedHash !== otpRecord.otpHash) {
      res.status(400).json({ success: false, message: 'Invalid OTP code.' });
      return;
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.status(404).json({ success: false, message: 'Account not found.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    // Mark email as verified if they proved ownership through reset OTP
    user.isEmailVerified = true;
    await user.save();

    await OTP.deleteOne({ _id: otpRecord._id });

    res.status(200).json({
      success: true,
      message: 'Password successfully updated! You can now log in with your new password.',
    });
  } catch (error: any) {
    console.error('[Reset Password Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update password.' });
  }
}

// POST /api/auth/change-password (Authenticated)
export async function changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
      return;
    }

    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    if (currentPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        res.status(400).json({ success: false, message: 'Current password does not match.' });
        return;
      }
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully.' });
  } catch (error: any) {
    console.error('[Change Password Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Error updating password.' });
  }
}

// GET /api/auth/me
export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    res.status(200).json({
      success: true,
      user: req.user.toJSON(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching user profile.' });
  }
}

// POST /api/auth/send-otp (Generic endpoint for requesting email OTP)
export async function sendOTP(req: Request, res: Response): Promise<void> {
  try {
    const { email, purpose, name } = req.body;

    if (!email) {
      res.status(400).json({ success: false, message: 'Email address is required.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const validPurpose = purpose === 'PASSWORD_RESET' ? 'PASSWORD_RESET' : 'EMAIL_VERIFY';

    // 60-second cooldown per email
    const existingOTP = await OTP.findOne({ email: normalizedEmail, purpose: validPurpose });
    if (existingOTP && Date.now() - existingOTP.createdAt.getTime() < 60 * 1000) {
      const waitSeconds = Math.ceil((60 * 1000 - (Date.now() - existingOTP.createdAt.getTime())) / 1000);
      res.status(429).json({
        success: false,
        message: `Please wait ${waitSeconds}s before requesting a new OTP code.`,
      });
      return;
    }

    // Look up user name if not provided
    let recipientName = name;
    if (!recipientName) {
      const foundUser = await User.findOne({ email: normalizedEmail });
      if (foundUser) recipientName = foundUser.name;
    }

    // Invalidate prior OTPs
    await OTP.deleteMany({ email: normalizedEmail, purpose: validPurpose });

    // Cryptographically secure 6-digit OTP
    const rawOTP = crypto.randomInt(100000, 1000000).toString();
    const otpHash = hashOTP(rawOTP);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await OTP.create({
      email: normalizedEmail,
      otpHash,
      purpose: validPurpose,
      expiresAt,
      attempts: 0,
    });

    // Respond immediately; email continues in the background.
    sendOTPEmailInBackground({
      to: normalizedEmail,
      name: recipientName || 'Participant',
      otp: rawOTP,
      purpose: validPurpose === 'PASSWORD_RESET' ? 'reset' : 'verification',
    });

    res.status(200).json({
      success: true,
      message: `A 6-digit OTP code has been dispatched to ${normalizedEmail}.`,
      email: normalizedEmail,
      emailDelivered: true,
    });
  } catch (error: any) {
    console.error('[Send OTP Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Error generating and sending OTP.' });
  }
}

// POST /api/auth/verify-otp (Generic endpoint for verifying email OTP)
export async function verifyOTP(req: Request, res: Response): Promise<void> {
  try {
    const { email, otp, purpose } = req.body;

    if (!email || !otp) {
      res.status(400).json({ success: false, message: 'Email and 6-digit OTP are required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanOTP = otp.toString().trim();
    const validPurpose = purpose === 'PASSWORD_RESET' ? 'PASSWORD_RESET' : 'EMAIL_VERIFY';

    const otpRecord = await OTP.findOne({ email: normalizedEmail, purpose: validPurpose });
    if (!otpRecord) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP. Please request a fresh verification code.',
      });
      return;
    }

    // Expiry check (5 mins)
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      res.status(400).json({
        success: false,
        message: 'OTP has expired. Code is strictly valid for 5 minutes. Please request a new one.',
      });
      return;
    }

    // Attempt rate-limiting
    if (otpRecord.attempts >= 5) {
      await OTP.deleteOne({ _id: otpRecord._id });
      res.status(429).json({
        success: false,
        message: 'Maximum incorrect verification attempts exceeded. For security, this OTP was invalidated.',
      });
      return;
    }

    // Verify hash
    const computedHash = hashOTP(cleanOTP);
    if (computedHash !== otpRecord.otpHash) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      const remaining = 5 - otpRecord.attempts;
      res.status(400).json({
        success: false,
        message: `Incorrect OTP. ${remaining} attempt(s) remaining.`,
      });
      return;
    }

    // OTP Verified! Prevent re-use by immediate deletion
    await OTP.deleteOne({ _id: otpRecord._id });

    // Mark email verified on user record if verifying email
    let updatedUser = null;
    const user = await User.findOne({ email: normalizedEmail });
    if (user && validPurpose === 'EMAIL_VERIFY') {
      user.isEmailVerified = true;
      await user.save();
      updatedUser = user.toJSON();
    }

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully!',
      verified: true,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('[Verify OTP Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Error verifying OTP.' });
  }
}
