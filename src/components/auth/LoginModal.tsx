import React, { useState } from 'react';
import { UserRole, User } from '../../types';
import { dbService } from '../../services/dbService';
import { SoundEngine } from '../AudioEngine';
import {
  X,
  Lock,
  Mail,
  GraduationCap,
  ShieldCheck,
  ClipboardList,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  UserPlus,
  Building2,
  MapPin,
  Eye,
  EyeOff,
  KeyRound,
  RotateCcw,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: Omit<User, 'passwordHash'>) => void;
  initialRole?: UserRole;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialRole = 'student',
}) => {
  const [activeRole, setActiveRole] = useState<UserRole>(initialRole);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

  // OTP verification for registration
  const [registrationStep, setRegistrationStep] = useState<'form' | 'verify'>('form');
  const [registrationOTP, setRegistrationOTP] = useState('');
  const [otpResendCountdown, setOtpResendCountdown] = useState(0);

  // Reset password state
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state (for new students)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regCollege, setRegCollege] = useState('Lakireddy Bali Reddy College of Engineering (Autonomous)');
  const [regDepartment, setRegDepartment] = useState('cse');
  const [regRollNo, setRegRollNo] = useState('');
  const [regPhone, setRegPhone] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    try {
      setLoading(true);
      const user = await dbService.login(email.trim(), password, activeRole);
      SoundEngine.playSuccess();
      setSuccessMessage(`Welcome back, ${user.name}!`);
      setTimeout(() => {
        onLoginSuccess(user);
        onClose();
      }, 400);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      setErrorMessage('Please fill in all required registration fields.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    try {
      setLoading(true);
      const user = await dbService.registerUser({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: 'student',
        college: regCollege,
        department: regDepartment,
        phone: regPhone.trim(),
        rollNo: regRollNo.trim(),
      });

      SoundEngine.playSuccess();
      setSuccessMessage(`Registration initiated! A 6-digit OTP has been sent to ${regEmail}. Please verify to activate your account.`);
      setRegistrationStep('verify');
      setOtpResendCountdown(60);
      const interval = setInterval(() => {
        setOtpResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Student registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRegistrationOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!registrationOTP.trim() || registrationOTP.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit OTP sent to your email.');
      return;
    }

    try {
      setLoading(true);
      const result = await dbService.verifyOTP(regEmail.trim(), registrationOTP.trim(), 'EMAIL_VERIFY');
      
      if (result.verified && result.user) {
        SoundEngine.playSuccess();
        setSuccessMessage('Email verified successfully! Your account is now active.');
        setTimeout(() => {
          onLoginSuccess(result.user);
          onClose();
        }, 400);
      } else {
        setErrorMessage('OTP verification failed. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendRegistrationOTP = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      setLoading(true);
      const result = await dbService.sendOTP(regEmail.trim(), 'EMAIL_VERIFY', regName.trim());
      SoundEngine.playClick();
      setSuccessMessage(result.message || 'A fresh 6-digit OTP has been sent to your email.');
      setOtpResendCountdown(60);
      const interval = setInterval(() => {
        setOtpResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      setLoading(true);
      const purpose = 'PASSWORD_RESET';
      const targetEmail = resetEmail.trim();
      const msg = await dbService.resendOTP(targetEmail, purpose);
      SoundEngine.playClick();
      setSuccessMessage(msg || 'A fresh 6-digit OTP has been sent to your email.');
      setOtpResendCountdown(60);
      const interval = setInterval(() => {
        setOtpResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const targetEmail = resetEmail.trim();
    if (!targetEmail) {
      setErrorMessage('Please enter your account email address.');
      return;
    }

    try {
      setLoading(true);
      const msg = await dbService.forgotPassword(targetEmail);
      SoundEngine.playSuccess();
      setSuccessMessage(msg || 'Password reset OTP sent to your email.');
      setResetStep('verify');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send reset OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!resetOtp.trim() || resetOtp.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit OTP sent to your email.');
      return;
    }

    if (!resetNewPassword || resetNewPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setErrorMessage('Passwords do not match. Please verify and re-type.');
      return;
    }

    try {
      setLoading(true);
      const msg = await dbService.resetPassword(resetEmail.trim(), resetNewPassword, resetOtp.trim());
      SoundEngine.playSuccess();
      setSuccessMessage(msg || 'Password successfully updated! You can now log in.');
      setEmail(resetEmail.trim());
      setPassword(resetNewPassword);
      setTimeout(() => {
        setIsResetMode(false);
        setResetStep('request');
        setResetOtp('');
        setResetNewPassword('');
        setResetConfirmPassword('');
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="login-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          SoundEngine.playClick();
          onClose();
        }
      }}
    >
      <div
        id="login-modal-card"
        className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-[#0c071e] border border-purple-800/60 shadow-2xl shadow-purple-950/70 overflow-hidden my-8"
      >
        {/* Header Decor */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 z-20" />

        {/* College Campus Visual Banner */}
        <div className="relative h-32 sm:h-36 w-full overflow-hidden border-b border-purple-900/60 group">
          <img
            src="/assets/lbrce_campus.jpg"
            alt="Lakireddy Bali Reddy College of Engineering Campus"
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-purple-950/20" />

          {/* Close Button */}
          <button
            id="btn-close-login"
            onClick={() => {
              SoundEngine.playClick();
              onClose();
            }}
            className="absolute right-4 top-4 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-purple-800/50 transition-colors cursor-pointer z-10 backdrop-blur-md"
            title="Close Portal"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="absolute bottom-3 left-5 right-5 flex items-end justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-950/90 border border-purple-500/50 p-1.5 flex items-center justify-center shrink-0 shadow-lg shadow-purple-950/60 backdrop-blur-md">
                <Building2 className="w-4 h-4 text-pink-400" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-pink-400 font-bold block leading-tight">
                  Host Institution
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide truncate max-w-[250px] sm:max-w-xs drop-shadow-md">
                  Lakireddy Bali Reddy College of Engineering
                </h4>
                <div className="flex items-center gap-2 text-[10px] font-mono text-purple-200/90">
                  <span>Autonomous • NAAC 'A+'</span>
                  <span>•</span>
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-2.5 h-2.5 text-pink-400" /> Mylavaram
                  </span>
                </div>
              </div>
            </div>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-pink-500/25 border border-pink-400/40 text-[10px] font-mono text-pink-300 font-bold backdrop-blur-md">
              Lakshya 2026
            </span>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {/* Header Title */}
          <div className="flex items-center gap-2 text-pink-400 mb-1">
            <Sparkles className="w-4 h-4" />
            <span className="text-[11px] font-mono uppercase tracking-widest font-bold">
              Lakshya 2026 Portal
            </span>
          </div>

          <h3 className="text-2xl font-black font-heading text-white tracking-tight mb-1">
            {isResetMode
              ? 'Reset Account Password'
              : isRegisterMode
              ? registrationStep === 'verify'
              ? 'Verify Your Email'
              : 'Student Registration'
              : 'Account Login'}
          </h3>
          <p className="text-xs text-slate-300 mb-6 font-sans">
            {isResetMode
              ? resetStep === 'request'
                ? 'Enter your registered email address to receive a secure password reset OTP code.'
                : `Enter the 6-digit OTP code sent to ${resetEmail} along with your new password.`
              : isRegisterMode
              ? registrationStep === 'verify'
              ? `Enter the 6-digit OTP code sent to ${regEmail} to activate your account.`
              : 'Create a student account to register for events & download passes.'
              : 'Select your role and authenticate to access your dedicated dashboard.'}
          </p>

          {/* Feedback messages */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500/50 flex items-start gap-2.5 text-xs text-red-200 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 flex items-start gap-2.5 text-xs text-emerald-200 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* FORGOT / RESET PASSWORD MODE OR LOGIN/REGISTER */}
          {isResetMode ? (
            /* 2. FORGOT / RESET PASSWORD MODE */
            resetStep === 'request' ? (
              <form onSubmit={handleSendResetOTP} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="name@college.edu"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-tech text-sm font-bold uppercase tracking-wider shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {loading ? 'Sending OTP...' : 'Send Password Reset OTP'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetMode(false);
                      setErrorMessage(null);
                    }}
                    className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    ← Back to Login
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                    6-Digit OTP Code *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full text-center text-xl font-mono font-bold tracking-[6px] py-2 rounded-xl bg-slate-950 border border-purple-900/60 text-cyan-300 focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                    New Password (Min 6 chars) *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      required
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/80 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                    Confirm New Password *
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      required
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 text-white font-tech text-sm font-bold uppercase tracking-wider shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {loading ? 'Updating Password...' : 'Verify OTP & Reset Password'}
                </button>

                <div className="flex items-center justify-between pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setResetStep('request');
                      setErrorMessage(null);
                    }}
                    className="text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    ← Change Email
                  </button>
                  <button
                    type="button"
                    disabled={loading || otpResendCountdown > 0}
                    onClick={handleResendOTP}
                    className="text-pink-400 hover:text-pink-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{otpResendCountdown > 0 ? `Wait ${otpResendCountdown}s` : 'Resend OTP'}</span>
                  </button>
                </div>
              </form>
            )
          ) : !isRegisterMode ? (
            /* 3. LOGIN MODE */
            <>
              {/* Role Selection Tabs */}
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-950 border border-purple-900/60 mb-5">
                <button
                  type="button"
                  id="tab-role-student"
                  onClick={() => {
                    SoundEngine.playClick();
                    setActiveRole('student');
                    setErrorMessage(null);
                  }}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeRole === 'student'
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <GraduationCap className="w-4 h-4 mb-1" />
                  <span>Student</span>
                </button>

                <button
                  type="button"
                  id="tab-role-coordinator"
                  onClick={() => {
                    SoundEngine.playClick();
                    setActiveRole('coordinator');
                    setErrorMessage(null);
                  }}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeRole === 'coordinator'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ClipboardList className="w-4 h-4 mb-1" />
                  <span>Co-ordinator</span>
                </button>

                <button
                  type="button"
                  id="tab-role-admin"
                  onClick={() => {
                    SoundEngine.playClick();
                    setActiveRole('admin');
                    setErrorMessage(null);
                  }}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeRole === 'admin'
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 mb-1" />
                  <span>Admin</span>
                </button>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      id="input-login-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@lbrce.ac.in"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-mono uppercase text-slate-400">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        SoundEngine.playClick();
                        setResetEmail(email);
                        setIsResetMode(true);
                        setResetStep('request');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      id="input-login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/80 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  id="btn-submit-login"
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-tech text-sm font-bold uppercase tracking-wider shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                  {loading ? (
                    <span>Authenticating...</span>
                  ) : (
                    <>
                      <span>Enter {activeRole.toUpperCase()} Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {activeRole === 'student' && (
                  <div className="text-center pt-3 border-t border-purple-950">
                    <span className="text-xs text-slate-400">Don't have a student login yet? </span>
                    <button
                      type="button"
                      onClick={() => {
                        SoundEngine.playClick();
                        setIsRegisterMode(true);
                        setErrorMessage(null);
                      }}
                      className="text-xs font-tech font-bold text-pink-400 hover:text-pink-300 underline cursor-pointer"
                    >
                      Register as Student
                    </button>
                  </div>
                )}
              </form>
            </>
          ) : (
            /* 4. STUDENT SIGN UP MODE */
            registrationStep === 'verify' ? (
              /* OTP Verification Step */
              <form onSubmit={handleVerifyRegistrationOTP} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                    6-Digit OTP Code *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={registrationOTP}
                    onChange={(e) => setRegistrationOTP(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full text-center text-xl font-mono font-bold tracking-[6px] py-2 rounded-xl bg-slate-950 border border-purple-900/60 text-cyan-300 focus:border-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 text-white font-tech text-sm font-bold uppercase tracking-wider shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify & Activate Account'}
                </button>

                <div className="flex items-center justify-between pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setRegistrationStep('form');
                      setErrorMessage(null);
                      setRegistrationOTP('');
                    }}
                    className="text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    ← Change Email
                  </button>
                  <button
                    type="button"
                    disabled={loading || otpResendCountdown > 0}
                    onClick={handleResendRegistrationOTP}
                    className="text-pink-400 hover:text-pink-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{otpResendCountdown > 0 ? `Wait ${otpResendCountdown}s` : 'Resend OTP'}</span>
                  </button>
                </div>
              </form>
            ) : (
              /* Registration Form Step */
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Full Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div className="grid grid-cols-1 min-[440px]:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                      Real Email *
                    </label>
                    <input
                      required
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="student@college.edu"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                      Password *
                    </label>
                    <input
                      required
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    College / University *
                  </label>
                  <input
                    required
                    type="text"
                    value={regCollege}
                    onChange={(e) => setRegCollege(e.target.value)}
                    placeholder="e.g. LBRCE or other institution"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div className="grid grid-cols-1 min-[440px]:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                      Department
                    </label>
                    <select
                      value={regDepartment}
                      onChange={(e) => setRegDepartment(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500"
                    >
                      <option value="cse">CSE</option>
                      <option value="it">IT</option>
                      <option value="aids">AI&DS</option>
                      <option value="aiml">AI&ML</option>
                      <option value="ece">ECE</option>
                      <option value="eee">EEE</option>
                      <option value="mech">MECH</option>
                      <option value="civil">CIVIL</option>
                      <option value="aero">AERO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Roll No / Reg ID
                  </label>
                  <input
                    type="text"
                    value={regRollNo}
                    onChange={(e) => setRegRollNo(e.target.value)}
                    placeholder="e.g. 23LBR0501"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-tech text-sm font-bold uppercase tracking-wider shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{loading ? 'Creating Account...' : 'Continue to Email Verification'}</span>
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      SoundEngine.playClick();
                      setIsRegisterMode(false);
                      setRegistrationStep('form');
                      setErrorMessage(null);
                      setRegistrationOTP('');
                    }}
                    className="text-xs text-slate-400 hover:text-white cursor-pointer underline"
                  >
                    ← Already have an account? Back to Login
                  </button>
                </div>
              </form>
            )
          )}
        </div>
      </div>
    </div>
  );
};
