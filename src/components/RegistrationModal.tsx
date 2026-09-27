import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { EventItem } from '../types';
import { SoundEngine } from './AudioEngine';
import { dbService } from '../services/dbService';
import {
  X,
  CheckCircle2,
  Ticket,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Building2,
  MapPin,
  CreditCard,
  QrCode,
  AlertCircle,
} from 'lucide-react';

interface RegistrationModalProps {
  initialEvent: EventItem | null;
  onClose: () => void;
  onGoToPass: () => void;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  initialEvent,
  onClose,
  onGoToPass,
}) => {
  const currentUser = dbService.getCurrentUser();

  const [fullName, setFullName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [college, setCollege] = useState(currentUser?.college || 'Lakireddy Bali Reddy College of Engineering (Autonomous)');
  const [branch, setBranch] = useState(currentUser?.department?.toUpperCase() || 'CSE');
  const [teamMembers, setTeamMembers] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [regId, setRegId] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [availableEvents, setAvailableEvents] = useState<EventItem[]>(() => dbService.getPublicEvents());
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEvent?.id || '');

  useEffect(() => {
    const publicEvents = dbService.getPublicEvents();
    setAvailableEvents(publicEvents);
    if (initialEvent) {
      setSelectedEventId(initialEvent.id);
    } else if (publicEvents.length > 0 && !selectedEventId) {
      setSelectedEventId(publicEvents[0].id);
    }
  }, [initialEvent]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const activeEvent = availableEvents.find((e) => e.id === selectedEventId) || initialEvent || availableEvents[0];
  const isFreeEvent = !activeEvent?.entryFee || activeEvent.entryFee.toLowerCase().includes('free') || activeEvent.entryFee === '0';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!fullName || !email || !phone || !college) {
      setValidationError('Please fill in all required registration fields.');
      return;
    }

    const targetEventId = activeEvent?.id || 'cse-1';

    try {
      setIsProcessing(true);

      const res = await dbService.registerForEvent({
        eventId: targetEventId,
        studentName: fullName,
        studentEmail: email,
        studentPhone: phone,
        college: college,
        department: branch.toLowerCase(),
        teamMembers: teamMembers.trim() || undefined,
      });

      if (!res.isPaid || !res.paymentOrder) {
        // Free Event -> Instantly confirmed
        setRegId(res.registration.qrToken || res.registration.id);
        setQrDataUrl(res.registration.qrCodeDataUrl || null);
        setIsSubmitted(true);
        SoundEngine.playSuccess();
        try {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        } catch {}
      } else {
        // Paid Event -> Initiate official Razorpay checkout
        const order = res.paymentOrder;
        console.log('[Payment Order Created]', order);
        
        const scriptLoaded = await loadRazorpayScript();

        if (!scriptLoaded || !(window as any).Razorpay) {
          setValidationError('Payment gateway script could not load. Please check internet connection.');
          setIsProcessing(false);
          return;
        }

        const options = {
          key: order.key,
          amount: order.amount,
          currency: order.currency,
          name: 'LBRCE Lakshya 2026',
          description: `Event Registration: ${order.eventName}`,
          order_id: order.id,
          prefill: {
            name: order.studentName,
            email: order.studentEmail,
            contact: order.studentPhone,
          },
          theme: {
            color: '#ec4899',
          },
          handler: async (response: any) => {
            try {
              setIsProcessing(true);
              console.log('[Razorpay Payment Success]', response);
              
              const verifyRes = await dbService.verifyPayment({
                registrationId: res.registration.id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });

              setRegId(verifyRes.qrToken);
              setQrDataUrl(verifyRes.qrCodeDataUrl);
              setIsSubmitted(true);
              SoundEngine.playSuccess();
              try {
                confetti({ particleCount: 140, spread: 85, origin: { y: 0.6 } });
              } catch {}
            } catch (err: any) {
              console.error('[Payment Verification Error]', err);
              setValidationError(err.message || 'Payment signature verification failed. Please contact support.');
            } finally {
              setIsProcessing(false);
            }
          },
          modal: {
            ondismiss: () => {
              setIsProcessing(false);
              setValidationError('Payment cancelled. Your registration is in PENDING state. You can complete it from your student dashboard.');
            },
            onerror: (response: any) => {
              console.error('[Razorpay Modal Error]', response);
              setIsProcessing(false);
              setValidationError('Payment gateway error. Please try again or contact support.');
            }
          },
        };

        try {
          const rzp = new (window as any).Razorpay(options);
          rzp.on('payment.failed', (response: any) => {
            setIsProcessing(false);
            const errorDesc = response.error?.description || response.error?.reason || 'Unknown error';
            const errorCode = response.error?.code || '';
            console.error('[Razorpay Payment Failed]', { errorCode, errorDesc, response });
            setValidationError(`Payment failed: ${errorDesc} ${errorCode ? `(${errorCode})` : ''}`);
          });
          rzp.open();
        } catch (rzpError) {
          console.error('[Razorpay Initialization Error]', rzpError);
          setValidationError('Failed to initialize payment gateway. Please try again.');
          setIsProcessing(false);
        }
      }
    } catch (err: any) {
      setValidationError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      id="registration-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          SoundEngine.playClick();
          onClose();
        }
      }}
    >
      <div
        id="registration-modal-container"
        className="relative w-full max-w-2xl rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-[#0c071e] border border-purple-800/60 shadow-2xl shadow-purple-950/60 overflow-hidden my-8"
      >
        {/* Campus Header Visual Banner */}
        <div className="relative h-28 sm:h-36 w-full overflow-hidden border-b border-purple-900/60 group">
          <img
            src="/assets/lbrce_campus.jpg"
            alt="Lakireddy Bali Reddy College of Engineering Campus"
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-purple-950/30" />

          <button
            id="btn-close-reg-modal"
            onClick={() => {
              SoundEngine.playClick();
              onClose();
            }}
            className="absolute right-4 top-4 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-purple-800/50 transition-colors cursor-pointer z-10 backdrop-blur-md"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-950/90 border border-purple-500/50 p-1 flex items-center justify-center shrink-0 shadow-lg backdrop-blur-md">
                <Building2 className="w-3.5 h-3.5 text-pink-400" />
              </div>
              <div>
                <span className="text-[9px] font-mono uppercase tracking-widest text-pink-400 font-bold block">
                  Symposium Venue
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide truncate max-w-[280px] sm:max-w-md">
                  LBRCE Campus • Mylavaram, Andhra Pradesh
                </h4>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-purple-200 px-2 py-0.5 rounded-md bg-slate-900/80 border border-purple-800/40 backdrop-blur-md">
              <MapPin className="w-2.5 h-2.5 text-pink-400" /> 65-Acre Campus
            </span>
          </div>
        </div>

        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8">
            <div className="flex items-center gap-2 text-pink-400 mb-2">
              <Ticket className="w-5 h-5" />
              <span className="text-xs font-mono uppercase tracking-widest font-bold">
                LBRCE Lakshya Portal
              </span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold font-heading text-white mb-2">
              {activeEvent ? `Register: ${activeEvent.title}` : 'Lakshya All-Access Registration'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mb-6 font-sans">
              Secure your spot for the symposium. Once verified, a cryptographically signed digital delegate pass with turnstile QR will be issued.
            </p>

            {activeEvent && (
              <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/30 mb-6 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-purple-300 uppercase block">Selected Event</span>
                  <span className="text-sm font-bold text-white">{activeEvent.title}</span>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 rounded-lg bg-pink-500/20 text-pink-300 font-mono text-xs font-bold border border-pink-500/40">
                    {activeEvent.entryFee}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 block mt-1">
                    {isFreeEvent ? 'Free Registration' : 'Payment Verification via Gateway'}
                  </span>
                </div>
              </div>
            )}

            {!initialEvent && (
              <div className="mb-6">
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                  Select Event to Register *
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40 transition-colors"
                >
                  {availableEvents.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.title} ({evt.deptId.toUpperCase()} • {evt.entryFee})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {validationError && (
              <div className="mb-6 p-3.5 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs font-mono flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Full Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Mobile Number (WhatsApp) *
                  </label>
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Registered Email Address *
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@college.edu.in"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    College / Institute *
                  </label>
                  <input
                    required
                    type="text"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    placeholder="e.g. LBRCE, JNTUK, VRSEC, VIT"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Branch / Dept
                  </label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500"
                  >
                    <option value="CSE">CSE (Computer Science & Engineering)</option>
                    <option value="IT">IT (Information Technology)</option>
                    <option value="AIDS">AI & DS (Artificial Intelligence & Data Science)</option>
                    <option value="AIML">AI & ML (Artificial Intelligence & Machine Learning)</option>
                    <option value="ECE">ECE (Electronics & Comm)</option>
                    <option value="EEE">EEE (Electrical)</option>
                    <option value="MECH">Mechanical Engineering</option>
                    <option value="CIVIL">Civil Engineering</option>
                    <option value="AERO">Aerospace Engineering</option>
                  </select>
                </div>
              </div>

              {activeEvent && activeEvent.teamSize !== 'Individual (1)' && (
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Team Members & Roll Nos (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={teamMembers}
                    onChange={(e) => setTeamMembers(e.target.value)}
                    placeholder="Member 2: Name & Roll No&#10;Member 3: Name & Roll No"
                    className="w-full px-4 py-2 rounded-xl bg-slate-950/80 border border-purple-900/60 text-white text-xs focus:outline-none focus:border-pink-500 font-mono"
                  />
                </div>
              )}
            </div>

            <div className="mt-8 pt-4 border-t border-purple-900/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-slate-400 flex items-center gap-1.5 font-sans">
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
                {isFreeEvent ? 'Complimentary Registration • Instant Pass' : 'Secure Razorpay Gateway • Official Verification'}
              </span>

              <button
                id="btn-submit-registration"
                type="submit"
                disabled={isProcessing}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-tech text-sm font-bold uppercase tracking-wider shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <span>Processing...</span>
                ) : isFreeEvent ? (
                  <>
                    <span>Confirm & Generate Badge</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Proceed to Pay {activeEvent.entryFee}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Confirmation Success State with Visual Registration QR */
          <div className="p-8 sm:p-10 text-center animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold font-heading text-white mb-2">
              Registration Confirmed!
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto mb-6">
              Welcome to Lakshya 2026. Your delegate pass has been cryptographically confirmed and registered with the LBRCE festival turnstiles.
            </p>

            {/* QR Code and Pass token display */}
            <div className="p-6 rounded-3xl bg-slate-950 border border-purple-800/60 max-w-xs mx-auto mb-6 text-center shadow-2xl shadow-purple-950/80">
              {qrDataUrl ? (
                <div className="p-3 bg-white rounded-2xl inline-block mb-3 shadow-inner">
                  <img src={qrDataUrl} alt="Official Registration QR Pass" className="w-40 h-40 mx-auto" />
                </div>
              ) : (
                <div className="w-40 h-40 bg-purple-950/40 border border-purple-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <QrCode className="w-16 h-16 text-cyan-400" />
                </div>
              )}

              <span className="text-[10px] font-mono text-purple-300/80 uppercase block mb-1">
                Official Verification Token
              </span>
              <span className="text-base font-mono font-bold text-cyan-400 tracking-wider block truncate">
                {regId}
              </span>
              <span className="text-[11px] text-slate-300 block mt-2 border-t border-purple-900/40 pt-2">
                {fullName} • {branch}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => {
                  onClose();
                  onGoToPass();
                }}
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-tech font-bold uppercase tracking-wider text-sm shadow-lg shadow-pink-600/30 flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Customize & Download Pass
              </button>
              <button
                onClick={onClose}
                className="px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-tech font-bold uppercase tracking-wider text-sm cursor-pointer border border-purple-900/40"
              >
                Back to Site
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
