import React, { useState, useEffect, useMemo } from 'react';
import { User, ManagedEvent, Registration, DepartmentId, NotificationItem, UserRole } from '../../types';
import { dbService } from '../../services/dbService';
import { DEPARTMENTS } from '../../data/lakshyaData';
import { SoundEngine } from '../AudioEngine';
import { 
  LayoutDashboard, 
  Calendar, 
  Layers, 
  Clock, 
  Ticket, 
  User as UserIcon, 
  Bell, 
  LogOut, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  ArrowLeft,
  Trophy,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Building2,
  AlertCircle,
  Trash2,
  Eye,
  EyeOff,
  KeyRound,
  X,
  QrCode,
  CreditCard,
} from 'lucide-react';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

interface StudentDashboardProps {
  user: Omit<User, 'passwordHash'>;
  onLogout: () => void;
  onBackToWebsite: () => void;
  onOpenPassView: () => void;
  onUserUpdate: (updatedUser: Omit<User, 'passwordHash'>) => void;
  onSwitchRole?: (role: UserRole) => void;
  availableRoles?: UserRole[];
}

type StudentTab = 
  | 'dashboard'
  | 'all-events'
  | 'departments'
  | 'upcoming'
  | 'registrations'
  | 'profile'
  | 'notifications';


export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  user,
  onLogout,
  onBackToWebsite,
  onOpenPassView,
  onUserUpdate,
  onSwitchRole,
  availableRoles = []
}) => {
  const [activeTab, setActiveTab] = useState<StudentTab>('dashboard');
  const [events, setEvents] = useState<ManagedEvent[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<DepartmentId>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedEventDetails, setSelectedEventDetails] = useState<ManagedEvent | null>(null);

  // Profile Form state
  const [profileName, setProfileName] = useState(user.name);
  const [profilePhone, setProfilePhone] = useState(user.phone || '');
  const [profileCollege, setProfileCollege] = useState(user.college);
  const [profileDepartment, setProfileDepartment] = useState(user.department);
  const [profileRollNo, setProfileRollNo] = useState(user.rollNo || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Registration action state
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [selectedQrPass, setSelectedQrPass] = useState<Registration | null>(null);
  const [payingRegId, setPayingRegId] = useState<string | null>(null);

  // Registration details form (name + roll no + teammates) shown BEFORE payment
  const [registerFormEvent, setRegisterFormEvent] = useState<ManagedEvent | null>(null);
  const [regFormName, setRegFormName] = useState('');
  const [regFormPhone, setRegFormPhone] = useState('');
  const [regFormRollNo, setRegFormRollNo] = useState('');
  const [regFormCollege, setRegFormCollege] = useState('');
  const [regFormDept, setRegFormDept] = useState('');
  const [regFormTeam, setRegFormTeam] = useState<{ name: string; rollNo: string }[]>([
    { name: '', rollNo: '' },
    { name: '', rollNo: '' },
    { name: '', rollNo: '' },
    { name: '', rollNo: '' },
    { name: '', rollNo: '' },
  ]);
  const [regFormError, setRegFormError] = useState<string | null>(null);
  const [regFormSubmitting, setRegFormSubmitting] = useState(false);

  const getFormMaxTeamSize = (teamSize?: string): number => {
    const nums = (teamSize || '').match(/\d+/g)?.map(Number) || [];
    if (nums.length === 0) return 4;
    return Math.min(Math.max(...nums), 6);
  };
  const formMaxTeam = getFormMaxTeamSize(registerFormEvent?.teamSize);
  const formIsTeamEvent = formMaxTeam > 1 && registerFormEvent?.teamSize !== 'Individual (1)';
  const formExtraSlots = formIsTeamEvent ? Math.min(formMaxTeam - 1, 5) : 0;

  const openRegisterForm = (event: ManagedEvent) => {
    SoundEngine.playClick();
    setRegisterError(null);
    setRegisterSuccess(null);
    setRegFormError(null);
    setRegFormName(user.name);
    setRegFormPhone(user.phone || '');
    setRegFormRollNo(user.rollNo || '');
    setRegFormCollege(user.college);
    setRegFormDept(user.department);
    setRegFormTeam([
      { name: '', rollNo: '' },
      { name: '', rollNo: '' },
      { name: '', rollNo: '' },
      { name: '', rollNo: '' },
      { name: '', rollNo: '' },
    ]);
    setSelectedEventDetails(null);
    setRegisterFormEvent(event);
  };

  // Load fresh data from db
  const reloadData = async () => {
    setEvents(dbService.getEvents());
    setRegistrations(dbService.getRegistrations());
    const notifs = await dbService.getNotifications(user.id, 'student');
    setNotifications(notifs);
    const evts = await dbService.syncEvents();
    if (evts && evts.length > 0) setEvents(evts);
    const regs = await dbService.syncRegistrations();
    if (regs && regs.length > 0) setRegistrations(regs);
  };


  useEffect(() => {
    reloadData();
  }, [user.id]);

  // Registrations specific to this student
  const myRegistrations = useMemo(() => {
    const userEmail = user.email.toLowerCase();
    return registrations.filter(
      r => r.studentId === user.id || r.studentEmail.toLowerCase() === userEmail
    );
  }, [registrations, user.id, user.email]);

  // Active registrations: confirmed OR payment-pending (excludes cancelled)
  const activeRegistrations = useMemo(() => {
    return myRegistrations.filter(
      r => r.status === 'confirmed' || r.status === 'pending'
    );
  }, [myRegistrations]);

  const registeredEventIds = useMemo(() => {
    return new Set(activeRegistrations.map(r => r.eventId));
  }, [activeRegistrations]);

  const registrationStateFor = (eventId: string): 'confirmed' | 'pending' | null => {
    const reg = activeRegistrations.find(r => r.eventId === eventId);
    if (!reg) return null;
    return reg.status === 'pending' ? 'pending' : 'confirmed';
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchSearch = e.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.venue.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDept = selectedDeptFilter === 'all' || e.department === selectedDeptFilter;
      const matchCategory = selectedCategoryFilter === 'all' || e.category === selectedCategoryFilter;
      return matchSearch && matchDept && matchCategory;
    });
  }, [events, searchQuery, selectedDeptFilter, selectedCategoryFilter]);

  const upcomingAndOngoingEvents = useMemo(() => {
    return events.filter(e => e.status === 'upcoming' || e.status === 'ongoing');
  }, [events]);

  const loadRazorpayScript = (): Promise<boolean> => {
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
  };

  const submitRegisterForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerFormEvent) return;
    const event = registerFormEvent;
    setRegFormError(null);
    setRegisterError(null);
    setRegisterSuccess(null);

    if (!regFormName.trim() || !regFormPhone.trim() || !regFormRollNo.trim() || !regFormCollege.trim()) {
      setRegFormError('Please fill Name, Mobile, Roll No and College before proceeding to pay.');
      return;
    }
    if (formIsTeamEvent) {
      for (let i = 0; i < formExtraSlots; i++) {
        const row = regFormTeam[i];
        const hasName = row.name.trim().length > 0;
        const hasRoll = row.rollNo.trim().length > 0;
        if ((hasName && !hasRoll) || (!hasName && hasRoll)) {
          setRegFormError(`Team Member ${i + 2}: both Name and Roll No are required together (or leave both empty).`);
          return;
        }
      }
    }
    const teamMembersStr = formIsTeamEvent
      ? regFormTeam.slice(0, formExtraSlots).filter((r) => r.name.trim() && r.rollNo.trim()).map((r) => `${r.name.trim()} (${r.rollNo.trim().toUpperCase()})`).join(', ') || undefined
      : undefined;

    try {
      setRegFormSubmitting(true);
      const res = await dbService.registerForEvent({
        eventId: event.id,
        studentId: user.id,
        studentName: regFormName.trim(),
        studentEmail: user.email,
        studentPhone: regFormPhone.trim(),
        studentRollNo: regFormRollNo.trim().toUpperCase(),
        college: regFormCollege.trim(),
        department: regFormDept || user.department,
        teamMembers: teamMembersStr,
      });
      setRegisterFormEvent(null);

      // Free Event -> Instantly confirmed
      if (!res.isPaid) {
        SoundEngine.playSuccess();
        setRegisterSuccess(`Successfully registered for ${event.eventName}!`);
        reloadData();
        setTimeout(() => setRegisterSuccess(null), 4000);
        return;
      }

      // Paid Event -> Obtain Razorpay order (fresh registration or pending resume)
      const order = res.paymentOrder || (await dbService.createPaymentOrder(res.registration.id));
      console.log('[Payment Order Created]', order);

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !(window as any).Razorpay) {
        setRegisterError('Payment gateway script could not load. Please check internet connection.');
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
            console.log('[Razorpay Payment Success]', response);
            const verifyRes = await dbService.verifyPayment({
              registrationId: res.registration.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            SoundEngine.playSuccess();
            setRegisterSuccess(`Payment confirmed! Registered for ${event.eventName}. Your pass is ready.`);
            if (verifyRes.qrCodeDataUrl) {
              setSelectedQrPass({
                ...res.registration,
                registrationStatus: 'CONFIRMED',
                status: 'confirmed',
                paymentStatus: 'PAID',
                qrToken: verifyRes.qrToken,
                qrCodeDataUrl: verifyRes.qrCodeDataUrl,
              });
            }
            reloadData();
            setTimeout(() => setRegisterSuccess(null), 5000);
          } catch (err: any) {
            console.error('[Payment Verification Error]', err);
            setRegisterError(err.message || 'Payment signature verification failed. Please contact support.');
          }
        },
        modal: {
          ondismiss: () => {
            setRegisterError('Payment cancelled. Your registration is in PENDING state. You can complete the payment from your registrations tab.');
          },
        },
      };

      try {
        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', (response: any) => {
          const errorDesc = response.error?.description || response.error?.reason || 'Unknown error';
          const errorCode = response.error?.code || '';
          console.error('[Razorpay Payment Failed]', { errorCode, errorDesc, response });
          setRegisterError(`Payment failed: ${errorDesc} ${errorCode ? `(${errorCode})` : ''}`);
        });
        rzp.open();
      } catch (rzpError) {
        console.error('[Razorpay Initialization Error]', rzpError);
        setRegisterError('Failed to initialize payment gateway. Please try again.');
      }
    } catch (err: any) {
      setRegFormError(err.message || 'Registration failed. Please try again.');
      setRegisterError(err.message || 'Registration failed. Please try again.');
      setTimeout(() => setRegisterError(null), 5000);
    } finally {
      setRegFormSubmitting(false);
    }
  };

  // Cancellation and deletion modal configuration
  const [deleteModalConfig, setDeleteModalConfig] = useState<{
    isOpen: boolean;
    type: 'cancel' | 'delete';
    id: string;
    name: string;
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'cancel',
    id: '',
    name: '',
    title: '',
    message: '',
  });

  const [studentToast, setStudentToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setStudentToast({ message, type });
    setTimeout(() => setStudentToast(null), 4000);
  };

  const requestCancelRegistration = (regId: string, eventName: string) => {
    SoundEngine.playClick();
    setDeleteModalConfig({
      isOpen: true,
      type: 'cancel',
      id: regId,
      name: eventName,
      title: 'Cancel Event Registration',
      message: `Are you sure you want to cancel your registration for "${eventName}"? Your reserved slot will be released.`
    });
  };

  const requestDeleteCancelledRegistration = (regId: string, eventName: string) => {
    SoundEngine.playClick();
    setDeleteModalConfig({
      isOpen: true,
      type: 'delete',
      id: regId,
      name: eventName,
      title: 'Remove Registration Record',
      message: `Are you sure you want to permanently delete this registration token (${regId}) from your festival dashboard?`
    });
  };

  const handleConfirmAction = async () => {
    setDeleteModalConfig(prev => ({ ...prev, isOpen: false }));
    try {
      if (deleteModalConfig.type === 'cancel') {
        await dbService.cancelRegistration(deleteModalConfig.id);
        SoundEngine.playSuccess();
        showToast(`Registration for "${deleteModalConfig.name}" was cancelled.`, 'success');
      } else {
        await dbService.deleteRegistration(deleteModalConfig.id);
        SoundEngine.playSuccess();
        showToast(`Record removed from your dashboard.`, 'success');
      }
      await reloadData();
    } catch (err: any) {
      showToast(err.message || 'Operation failed.', 'error');
    }
  };

  const handleCancelRegistration = (regId: string) => {
    const reg = myRegistrations.find(r => r.id === regId);
    requestCancelRegistration(regId, reg?.eventName || 'Event');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);

    if (newPassword && newPassword.length < 4) {
      setProfileError('New password must be at least 4 characters long.');
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      setProfileError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      const updated = await dbService.updateUser(user.id, {
        name: profileName.trim() || user.name,
        phone: profilePhone.trim() || undefined,
        college: profileCollege.trim() || user.college,
        department: profileDepartment,
        rollNo: profileRollNo.trim() || undefined,
        newPassword: newPassword.trim() || undefined
      });
      SoundEngine.playSuccess();
      setProfileSuccess(newPassword ? 'Password and profile updated successfully!' : 'Profile updated successfully!');
      onUserUpdate(updated);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    }
  };

  return (
    <div className="min-h-screen bg-[#070415] text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-950/95 border-b md:border-b-0 md:border-r border-purple-900/40 p-4 flex flex-col shrink-0">
        {/* Brand & User Capsule */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-purple-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-heading font-extrabold text-white text-base tracking-wider block">
                LAKSHYA 2026
              </span>
              <span className="text-[10px] font-mono text-pink-400 uppercase font-semibold">
                Student Portal
              </span>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-800/40 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-500/40 text-pink-300 flex items-center justify-center font-bold text-sm">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <span className="text-sm font-bold text-white block truncate">{user.name}</span>
              <span className="text-[10px] font-mono text-purple-300/80 block truncate">
                {user.rollNo || user.department.toUpperCase()} • {user.college.split(' (')[0]}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1 flex-1">
          <button
            onClick={() => { SoundEngine.playClick(); setActiveTab('dashboard'); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => { SoundEngine.playClick(); setActiveTab('all-events'); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'all-events'
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>All Events</span>
          </button>

          <button
            onClick={() => { SoundEngine.playClick(); setActiveTab('departments'); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'departments'
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Departments</span>
          </button>

          <button
            onClick={() => { SoundEngine.playClick(); setActiveTab('upcoming'); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'upcoming'
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Upcoming Events</span>
          </button>

          <button
            onClick={() => { SoundEngine.playClick(); setActiveTab('registrations'); }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'registrations'
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Ticket className="w-4 h-4" />
              <span>My Registrations</span>
            </div>
            {myRegistrations.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-mono text-[10px] font-bold">
                {activeRegistrations.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { SoundEngine.playClick(); setActiveTab('profile'); }}

            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>My Profile</span>
          </button>

          <button
            onClick={() => { SoundEngine.playClick(); setActiveTab('notifications'); }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'notifications'
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
            </div>
            {notifications.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-pink-500" />
            )}
          </button>
        </nav>

        {/* Footer controls: Back to fest site & Logout */}
        <div className="pt-4 mt-4 border-t border-purple-950 space-y-2">
          <button
            onClick={() => { SoundEngine.playClick(); onBackToWebsite(); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono text-purple-300 hover:text-white hover:bg-purple-950/40 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-pink-400" />
            <span>Back to Fest Site</span>
          </button>

          <button
            onClick={() => { SoundEngine.playClick(); onLogout(); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
        {/* In-App Toast Notification */}
        {studentToast && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-mono font-bold shadow-xl border animate-in fade-in slide-in-from-top-2 duration-200 ${
            studentToast.type === 'success' 
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' 
              : 'bg-red-950/80 border-red-500/50 text-red-300'
          }`}>
            <div className="flex items-center gap-2.5">
              {studentToast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
              <span>{studentToast.message}</span>
            </div>
            <button onClick={() => setStudentToast(null)} className="p-1 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Multi-Role Quick Switcher Banner */}
        {availableRoles && availableRoles.length > 1 && onSwitchRole && (
          <div className="mb-6 p-3 rounded-2xl bg-gradient-to-r from-pink-950/60 to-slate-900 border border-pink-800/40 flex flex-wrap items-center justify-between gap-3 text-xs backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
              <span className="font-mono text-pink-200">
                Active Console: <strong className="text-white">Student / Participant</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400">Switch View:</span>
              {availableRoles.map((r) => (
                <button
                  key={r}
                  onClick={() => onSwitchRole(r)}
                  className={`px-3 py-1 rounded-xl text-xs font-tech font-bold uppercase transition-all cursor-pointer ${
                    r === 'student'
                      ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                      : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-pink-900/50'
                  }`}
                >
                  {r === 'admin' ? '👑 Admin' : r === 'coordinator' ? '📋 Coordinator' : '🎓 Student'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Top alerts if any */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Hero Welcome banner with Campus Backdrop */}
            <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-950/80 via-slate-900/90 to-[#120a28] border border-purple-800/50 overflow-hidden shadow-2xl">
              {/* College Campus Photo Vignette on right */}
              <div className="absolute right-0 top-0 bottom-0 w-full sm:w-1/2 lg:w-5/12 overflow-hidden opacity-25 sm:opacity-35 pointer-events-none">
                <img
                  src="/assets/lbrce_campus.jpg"
                  alt="Lakireddy Bali Reddy College of Engineering Campus"
                  className="w-full h-full object-cover object-center"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
              </div>

              <div className="max-w-2xl relative z-10">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-mono uppercase text-pink-400 tracking-wider font-semibold">
                    Lakshya 2026 Student Dashboard
                  </span>
                  <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    LBRCE Mylavaram
                  </span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold font-heading text-white tracking-tight mb-2">
                  Welcome, {user.name}!
                </h1>
                <p className="text-sm text-slate-300 leading-relaxed mb-6 font-sans">
                  Explore all technical arenas, manage your registered events, track competition timings, and generate your 3D verified delegate pass.
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setActiveTab('all-events')}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-tech font-bold uppercase tracking-wider shadow-lg shadow-pink-600/30 flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Browse All Events</span>
                  </button>

                  <button
                    onClick={() => { SoundEngine.playClick(); onOpenPassView(); }}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-purple-700/50 text-purple-200 hover:text-white text-xs font-tech font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>Holographic Delegate Pass</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-purple-900/50">
                <span className="text-[11px] font-mono text-purple-300 uppercase block mb-1">Registered Events</span>
                <span className="text-3xl font-tech font-extrabold text-white">
                  {activeRegistrations.length}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-purple-900/50">
                <span className="text-[11px] font-mono text-cyan-300 uppercase block mb-1">Total Available</span>
                <span className="text-3xl font-tech font-extrabold text-cyan-400">
                  {events.length} Events
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-purple-900/50">
                <span className="text-[11px] font-mono text-pink-300 uppercase block mb-1">Departments</span>
                <span className="text-3xl font-tech font-extrabold text-pink-400">
                  10 Branches
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-purple-900/50">
                <span className="text-[11px] font-mono text-emerald-300 uppercase block mb-1">Campus Status</span>
                <span className="text-sm font-tech font-bold text-emerald-400 mt-2 block">
                  Turnstiles Ready
                </span>
              </div>
            </div>

            {/* Recent Registrations & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-3xl bg-slate-950/80 border border-purple-900/40">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading font-bold text-lg text-white">My Active Registrations</h3>
                  <button
                    onClick={() => setActiveTab('registrations')}
                    className="text-xs font-mono text-pink-400 hover:underline"
                  >
                    View All ({myRegistrations.length})
                  </button>
                </div>

                {activeRegistrations.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <Ticket className="w-8 h-8 mx-auto mb-2 text-purple-400/50" />
                    <p className="text-sm">You haven't registered for any events yet.</p>
                    <button
                      onClick={() => setActiveTab('all-events')}
                      className="mt-3 px-4 py-2 rounded-xl bg-pink-600/20 border border-pink-500/40 text-pink-300 text-xs font-tech font-bold uppercase"
                    >
                      Explore Events
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeRegistrations
                      .slice(0, 3)
                      .map((reg) => (
                        <div
                          key={reg.id}
                          className="p-3.5 rounded-2xl bg-slate-900/70 border border-purple-900/40 flex items-center justify-between"
                        >
                          <div>
                            <span className="text-xs font-bold text-white block">{reg.eventName}</span>
                            <span className="text-[11px] font-mono text-purple-300/80">
                              Token: {reg.id} • Dept: {reg.department.toUpperCase()}
                            </span>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase border ${
                            reg.status === 'confirmed'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                          }`}>
                            {reg.status === 'confirmed' ? 'Confirmed' : 'Payment Pending'}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Latest Festival Updates */}
              <div className="p-6 rounded-3xl bg-slate-950/80 border border-purple-900/40">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading font-bold text-lg text-white">Symposium Announcements</h3>
                  <button
                    onClick={() => setActiveTab('notifications')}
                    className="text-xs font-mono text-pink-400 hover:underline"
                  >
                    All Alerts
                  </button>
                </div>

                <div className="space-y-3">
                  {notifications.slice(0, 2).map((notif) => (
                    <div
                      key={notif.id}
                      className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-800/30"
                    >
                      <span className="text-xs font-bold text-pink-300 block mb-1">{notif.title}</span>
                      <p className="text-xs text-slate-300 line-clamp-2">{notif.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ALL EVENTS */}
        {activeTab === 'all-events' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                All College Events
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Browse and register for all national-level technical competitions across 10 branches.
              </p>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by event title, rules, or venue..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500"
                />
              </div>

              {/* Department Filter */}
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value as DepartmentId)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-purple-900/60 text-white text-xs font-mono focus:outline-none focus:border-pink-500"
              >
                <option value="all">All Departments (10 Branches)</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name.split(' (')[0]}
                  </option>
                ))}
              </select>

              {/* Category Filter */}
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-purple-900/60 text-white text-xs font-mono focus:outline-none focus:border-pink-500"
              >
                <option value="all">All Categories</option>
                <option value="coding">Coding & Software</option>
                <option value="robotics">Robotics & Hardware</option>
                <option value="technical">Technical Challenges</option>
                <option value="paper">Paper & Design</option>
              </select>
            </div>

            {/* Events Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredEvents.map((event) => {
                const regState = registrationStateFor(event.id);
                const isRegistered = regState !== null;
                return (
                  <div
                    key={event.id}
                    className="p-5 rounded-3xl bg-slate-950/80 border border-purple-900/40 hover:border-pink-500/50 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold uppercase border border-purple-500/30">
                          {event.department.toUpperCase()}
                        </span>
                        <span className="text-[11px] font-mono text-cyan-400 font-bold">
                          {event.entryFee}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-white mb-1.5">{event.eventName}</h3>
                      <p className="text-xs text-slate-300 line-clamp-2 mb-4 leading-relaxed">
                        {event.description}
                      </p>

                      <div className="space-y-1.5 text-[11px] font-mono text-slate-400 mb-4 bg-purple-950/20 p-3 rounded-xl border border-purple-900/30">
                        <div>📍 Venue: <span className="text-white">{event.venue}</span></div>
                        <div>⏰ Time: <span className="text-white">{event.time}</span></div>
                        <div>👥 Team Size: <span className="text-white">{event.teamSize}</span></div>
                        <div className="text-pink-300 font-bold">🏆 1st Prize: {event.prizes.first}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-purple-950">
                      <button
                        onClick={() => setSelectedEventDetails(event)}
                        className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-tech font-bold uppercase border border-purple-900/40 cursor-pointer"
                      >
                        Details
                      </button>

                      {isRegistered ? (
                        regState === 'pending' ? (
                          <div className="flex-1 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-tech font-bold uppercase text-center flex items-center justify-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Payment Pending</span>
                          </div>
                        ) : (
                          <div className="flex-1 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-tech font-bold uppercase text-center flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Registered</span>
                          </div>
                        )
                      ) : (
                        <button
                          onClick={() => openRegisterForm(event)}
                          className="flex-1 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-tech font-bold uppercase shadow-lg shadow-pink-600/30 cursor-pointer"
                        >
                          Register
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: DEPARTMENTS */}
        {activeTab === 'departments' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                Participating Departments (10 Branches)
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Explore individual department arenas, themes, faculty coordinators, and featured challenges.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {DEPARTMENTS.map((dept) => {
                const deptEvents = events.filter(e => e.department === dept.id);
                return (
                  <div
                    key={dept.id}
                    className="p-6 rounded-3xl bg-slate-950/80 border border-purple-900/40 hover:border-pink-500/40 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-mono font-bold uppercase text-pink-400">
                          {dept.code}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold">
                          {deptEvents.length} Events
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-white mb-2">{dept.name}</h3>
                      <p className="text-xs font-mono text-purple-300 mb-2 font-medium">
                        Theme: {dept.theme}
                      </p>
                      <p className="text-xs text-slate-300 leading-relaxed mb-4">
                        {dept.description}
                      </p>

                      <div className="text-[11px] font-mono text-slate-400 space-y-1 mb-4 p-3 rounded-xl bg-purple-950/30 border border-purple-900/30">
                        <div>Prize Vault: <span className="text-pink-300 font-bold">{dept.totalPrizes}</span></div>
                        <div>Badge Award: <span className="text-white">{dept.badge}</span></div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedDeptFilter(dept.id);
                        setActiveTab('all-events');
                      }}
                      className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-pink-300 text-xs font-tech font-bold uppercase tracking-wider border border-purple-900/50 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>View {dept.code} Events</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: UPCOMING EVENTS */}
        {activeTab === 'upcoming' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                Upcoming & Ongoing Arena Schedule
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Track event start times and ensure you report at campus venues ahead of schedule.
              </p>
            </div>

            <div className="space-y-4">
              {upcomingAndOngoingEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-5 rounded-2xl bg-slate-950/80 border border-purple-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                        event.status === 'ongoing' 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      }`}>
                        {event.status}
                      </span>
                      <span className="text-xs font-mono text-purple-300 uppercase">
                        Dept: {event.department.toUpperCase()}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white">{event.eventName}</h3>
                    <p className="text-xs text-slate-400">
                      📍 {event.venue} • ⏰ {event.time} • 🏆 Cash: {event.prizes.first}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setSelectedEventDetails(event)}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 text-xs font-tech font-bold uppercase cursor-pointer hover:bg-slate-800"
                    >
                      Rulebook
                    </button>
                    {!registeredEventIds.has(event.id) ? (
                      <button
                        onClick={() => openRegisterForm(event)}
                        className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-tech font-bold uppercase cursor-pointer"
                      >
                        Register
                      </button>
                    ) : (
                      <span className="px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold">
                        Enrolled
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: MY REGISTRATIONS */}
        {activeTab === 'registrations' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                  My Registered Events
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  Manage your active symposium registrations, cancellation tokens, and verified credential pass.
                </p>
              </div>

              <button
                onClick={() => { SoundEngine.playClick(); onOpenPassView(); }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 hover:from-purple-500 text-white text-xs font-tech font-bold uppercase tracking-wider shadow-lg flex items-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <Sparkles className="w-4 h-4" />
                <span>Open Holographic Pass</span>
              </button>
            </div>

            {myRegistrations.length === 0 ? (
              <div className="p-12 rounded-3xl bg-slate-950/80 border border-purple-900/40 text-center max-w-md mx-auto">
                <Ticket className="w-12 h-12 mx-auto text-purple-400 mb-3" />
                <h3 className="text-lg font-bold text-white mb-1">No Registrations Yet</h3>
                <p className="text-xs text-slate-400 mb-5">
                  Browse through all technical and robotics events to register and secure your spot.
                </p>
                <button
                  onClick={() => setActiveTab('all-events')}
                  className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-tech font-bold uppercase tracking-wider"
                >
                  Explore Events
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myRegistrations.map((reg) => {
                  const isPaid = reg.paymentStatus === 'PAID' || reg.paymentStatus === 'FREE';
                  const isFree = reg.paymentStatus === 'FREE';
                  const isPending = reg.paymentStatus === 'PENDING';
                  const isFailed = reg.paymentStatus === 'FAILED';
                  const isConfirmed = reg.status === 'confirmed' || reg.registrationStatus === 'CONFIRMED';

                  return (
                    <div
                      key={reg.id}
                      className="p-5 rounded-2xl bg-slate-950/80 border border-purple-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono text-cyan-400 font-bold">{reg.qrToken || reg.id}</span>
                          
                          {/* Registration Status */}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            isConfirmed
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-red-500/20 text-red-300 border border-red-500/40'
                          }`}>
                            {isConfirmed ? 'Registration Confirmed' : 'Cancelled'}
                          </span>

                          {/* Payment Status Badge */}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            isPaid
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : isPending
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                              : 'bg-red-500/20 text-red-300 border border-red-500/40'
                          }`}>
                            Payment: {reg.paymentStatus || (isConfirmed ? 'PAID' : 'PENDING')}
                          </span>

                          <span className="text-xs font-mono text-purple-300 uppercase">
                            {reg.department?.toUpperCase()}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-white">{reg.eventName}</h3>
                        <p className="text-xs text-slate-300">
                          Delegate: <span className="text-white font-medium">{reg.studentName}</span>
                          {reg.studentRollNo && (
                            <span className="text-cyan-300 font-mono"> ({reg.studentRollNo})</span>
                          )} • College: <span className="text-white">{reg.college}</span>
                        </p>
                        {reg.teamMembers && (
                          <p className="text-xs text-purple-300 font-mono">
                            Team Members + Roll Nos: {reg.teamMembers}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 pt-1">
                          <span>Date: {new Date(reg.registrationDate).toLocaleString()}</span>
                          {reg.checkedIn && (
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Checked In at Turnstile
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* View QR Pass button for confirmed registrations */}
                        {isConfirmed && isPaid && (
                          <button
                            onClick={() => {
                              SoundEngine.playClick();
                              setSelectedQrPass(reg);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 text-purple-200 text-xs font-tech font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-purple-900/30"
                          >
                            <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                            <span>View QR Pass</span>
                          </button>
                        )}

                        {/* Complete Payment Button for pending/failed */}
                        {!isPaid && (isConfirmed || isPending || isFailed) && (
                          <button
                            onClick={async () => {
                              try {
                                setPayingRegId(reg.id);
                                SoundEngine.playClick();
                                const order = await dbService.createPaymentOrder(reg.id);
                                const script = document.createElement('script');
                                script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                                script.onload = () => {
                                  const rzp = new (window as any).Razorpay({
                                    key: order.key,
                                    amount: order.amount,
                                    currency: order.currency,
                                    name: 'LBRCE Lakshya 2026',
                                    description: `Registration: ${reg.eventName}`,
                                    order_id: order.id,
                                    handler: async (resp: any) => {
                                      await dbService.verifyPayment({
                                        registrationId: reg.id,
                                        razorpay_order_id: resp.razorpay_order_id,
                                        razorpay_payment_id: resp.razorpay_payment_id,
                                        razorpay_signature: resp.razorpay_signature,
                                      });
                                      reloadData();
                                      showToast('Payment confirmed! Registration pass generated.', 'success');
                                    },
                                  });
                                  rzp.open();
                                };
                                document.body.appendChild(script);
                              } catch (err: any) {
                                showToast(err.message || 'Payment initiation failed.', 'error');
                              } finally {
                                setPayingRegId(null);
                              }
                            }}
                            disabled={payingRegId === reg.id}
                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-pink-600 hover:from-amber-500 hover:to-pink-500 text-white text-xs font-tech font-bold uppercase flex items-center gap-1.5 cursor-pointer shadow-lg"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>{payingRegId === reg.id ? 'Loading...' : 'Pay Fee Now'}</span>
                          </button>
                        )}

                        {isPending || isFailed || (isConfirmed && isFree) ? (
                          <button
                            onClick={() => requestCancelRegistration(reg.id, reg.eventName)}
                            className="px-3.5 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-300 text-xs font-tech font-bold uppercase cursor-pointer transition-colors"
                          >
                            Cancel
                          </button>
                        ) : (
                          <button
                            onClick={() => requestDeleteCancelledRegistration(reg.id, reg.eventName)}
                            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-red-950/40 border border-purple-900/40 hover:border-red-500/40 text-slate-400 hover:text-red-300 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
                            title="Remove cancelled entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: MY PROFILE */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                My Student Profile
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Update your registered student details, institutional affiliation, and security password.
              </p>
            </div>

            {profileSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="p-6 rounded-3xl bg-slate-950/80 border border-purple-900/40 space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Full Name
                </label>
                <input
                  required
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Email Address (Read Only)
                  </label>
                  <input
                    disabled
                    type="email"
                    value={user.email}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/40 border border-slate-800 text-slate-400 text-sm cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  College / Institute
                </label>
                <input
                  required
                  type="text"
                  value={profileCollege}
                  onChange={(e) => setProfileCollege(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Department
                  </label>
                  <select
                    value={profileDepartment}
                    onChange={(e) => setProfileDepartment(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500"
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
                    Roll Number / Reg ID
                  </label>
                  <input
                    type="text"
                    value={profileRollNo}
                    onChange={(e) => setProfileRollNo(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-purple-950/80 space-y-4">
                <div className="flex items-center gap-2 text-pink-300 text-sm font-bold font-heading">
                  <KeyRound className="w-4 h-4 text-pink-400" />
                  <span>Update Account Password</span>
                </div>
                <p className="text-xs text-slate-400">
                  Enter a new password below to update your login credentials. Leave blank to keep current.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min. 4 chars)"
                        className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500"
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

                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500">
                  Role: <strong className="text-pink-400 uppercase">Student</strong> ({user.rollNo || 'Delegate'})
                </span>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-tech font-bold uppercase tracking-wider shadow-lg shadow-pink-600/30 cursor-pointer transition-all"
                >
                  Save Profile & Password
                </button>
              </div>
            </form>

            {/* Host Institution Campus Card */}
            <div className="rounded-3xl bg-slate-950/80 border border-purple-900/50 overflow-hidden shadow-xl">
              <div className="relative h-44 sm:h-52 w-full overflow-hidden group">
                <img
                  src="/assets/lbrce_campus.jpg"
                  alt="Lakireddy Bali Reddy College of Engineering Campus"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-purple-800/40 text-[11px] font-mono text-pink-300 font-bold">
                  Host Institution
                </div>
              </div>
              <div className="p-5 sm:p-6">
                <h4 className="text-lg font-bold font-heading text-white mb-1">
                  Lakireddy Bali Reddy College of Engineering (Autonomous)
                </h4>
                <p className="text-xs text-slate-300 mb-3 font-sans">
                  Mylavaram, NTR District, Andhra Pradesh - 521230. Permanent Affiliation to JNTUK, NAAC 'A+' Accredited.
                </p>
                <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                  <span className="px-2.5 py-1 rounded-full bg-purple-950 border border-purple-800/50 text-purple-300">
                    65-Acre Sprawling Campus
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-purple-950 border border-purple-800/50 text-purple-300">
                    8 Department Arenas
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-purple-950 border border-purple-800/50 text-purple-300">
                    Venue of Lakshya 2026
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                Festival Notifications & Alerts
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Official symposium notices, round updates, and venue announcements.
              </p>
            </div>

            <div className="space-y-3">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="p-4 rounded-2xl bg-slate-950/80 border border-purple-900/40 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase text-pink-400 font-bold">
                      {notif.type.toUpperCase()}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(notif.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{notif.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{notif.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Registration Details Form Modal (shown BEFORE payment) */}
        {registerFormEvent && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setRegisterFormEvent(null);
            }}
          >
            <form
              onSubmit={submitRegisterForm}
              className="relative w-full max-w-xl rounded-3xl bg-slate-950 border border-purple-800/60 p-6 sm:p-8 space-y-4 my-8"
            >
              <button
                type="button"
                onClick={() => setRegisterFormEvent(null)}
                className="absolute right-4 top-4 p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-pink-400 font-bold">
                  Step 1: Confirm Details • Step 2: Pay
                </span>
                <h3 className="text-xl sm:text-2xl font-bold font-heading text-white mt-1">
                  Register: {registerFormEvent.eventName}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  {registerFormEvent.department.toUpperCase()} • {registerFormEvent.entryFee} • Team: {registerFormEvent.teamSize}
                </p>
              </div>

              {regFormError && (
                <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{regFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Full Name *</label>
                  <input
                    required
                    type="text"
                    value={regFormName}
                    onChange={(e) => setRegFormName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Mobile *</label>
                  <input
                    required
                    type="tel"
                    value={regFormPhone}
                    onChange={(e) => setRegFormPhone(e.target.value)}
                    placeholder="+91 ..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Your Roll No *</label>
                  <input
                    required
                    type="text"
                    value={regFormRollNo}
                    onChange={(e) => setRegFormRollNo(e.target.value.toUpperCase())}
                    placeholder="e.g. 23761A05A1"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Branch / Dept</label>
                  <select
                    value={regFormDept}
                    onChange={(e) => setRegFormDept(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">College *</label>
                <input
                  required
                  type="text"
                  value={regFormCollege}
                  onChange={(e) => setRegFormCollege(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500"
                />
              </div>

              {formIsTeamEvent && (
                <div className="p-4 rounded-xl bg-slate-900/60 border border-purple-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono uppercase text-slate-300 font-bold">
                      Other Team Members + Roll Nos
                    </label>
                    <span className="text-[10px] font-mono text-slate-500">You are Member 1</span>
                  </div>
                  {regFormTeam.slice(0, formExtraSlots).map((row, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => setRegFormTeam((prev) => prev.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)))}
                        placeholder={`Member ${idx + 2} Name`}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-purple-900/60 text-white text-xs focus:outline-none focus:border-pink-500"
                      />
                      <input
                        type="text"
                        value={row.rollNo}
                        onChange={(e) => setRegFormTeam((prev) => prev.map((r, i) => (i === idx ? { ...r, rollNo: e.target.value.toUpperCase() } : r)))}
                        placeholder={`Member ${idx + 2} Roll No`}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-purple-900/60 text-white text-xs focus:outline-none focus:border-pink-500 font-mono uppercase"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-purple-950">
                <button
                  type="button"
                  onClick={() => setRegisterFormEvent(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 text-slate-300 text-xs font-tech font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regFormSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 text-white text-xs font-tech font-bold uppercase shadow-lg shadow-pink-600/30 flex items-center gap-2 disabled:opacity-50"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{regFormSubmitting ? 'Processing...' : `Proceed to Pay ${registerFormEvent.entryFee}`}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Event Details Quick Modal */}
        {selectedEventDetails && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedEventDetails(null);
            }}
          >
            <div className="relative w-full max-w-xl rounded-3xl bg-slate-950 border border-purple-800/60 p-6 sm:p-8 space-y-5">
              <button
                onClick={() => setSelectedEventDetails(null)}
                className="absolute right-4 top-4 p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white"
              >
                ✕
              </button>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono text-xs uppercase">
                  {selectedEventDetails.department.toUpperCase()}
                </span>
                <span className="text-xs font-mono text-cyan-400 font-bold">
                  {selectedEventDetails.entryFee}
                </span>
              </div>

              <h3 className="text-2xl font-bold font-heading text-white">
                {selectedEventDetails.eventName}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {selectedEventDetails.description}
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-purple-950/20 p-4 rounded-2xl border border-purple-900/30">
                <div>📍 Venue: <span className="text-white">{selectedEventDetails.venue}</span></div>
                <div>⏰ Timing: <span className="text-white">{selectedEventDetails.time}</span></div>
                <div>👥 Team Size: <span className="text-white">{selectedEventDetails.teamSize}</span></div>
                <div>🏆 1st Prize: <span className="text-pink-300 font-bold">{selectedEventDetails.prizes.first}</span></div>
                <div>🥈 2nd Prize: <span className="text-slate-300">{selectedEventDetails.prizes.second}</span></div>
                <div>👤 Coordinator: <span className="text-white">{selectedEventDetails.coordinatorName}</span></div>
              </div>

              {selectedEventDetails.rules && selectedEventDetails.rules.length > 0 && (
                <div>
                  <h4 className="text-xs font-mono uppercase text-pink-400 font-bold mb-2">Rules & Guidelines</h4>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                    {selectedEventDetails.rules.map((rule, idx) => (
                      <li key={idx}>{rule}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-3 border-t border-purple-950 flex items-center justify-end gap-3">
                <button
                  onClick={() => setSelectedEventDetails(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 text-xs font-tech font-bold uppercase"
                >
                  Close
                </button>
                {!registeredEventIds.has(selectedEventDetails.id) && (
                  <button
                    onClick={() => {
                      openRegisterForm(selectedEventDetails);
                    }}
                    className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-tech font-bold uppercase shadow-lg shadow-pink-600/30"
                  >
                    Register Now
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* REGISTRATION QR BADGE PASS MODAL */}
        {selectedQrPass && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
            onClick={() => setSelectedQrPass(null)}
          >
            <div
              className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-slate-900 via-[#0e0824] to-black border border-purple-800/80 p-6 text-center shadow-2xl shadow-purple-950/90"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedQrPass(null)}
                className="absolute right-4 top-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-2 text-pink-400 mb-2">
                <Sparkles className="w-4 h-4" />
                <span className="text-[11px] font-mono uppercase tracking-widest font-bold">
                  Official Delegate Pass
                </span>
              </div>

              <h3 className="text-xl font-bold text-white mb-1">{selectedQrPass.eventName}</h3>
              <p className="text-xs text-slate-300 mb-1">
                {selectedQrPass.studentName}
                {selectedQrPass.studentRollNo && (
                  <span className="text-cyan-300 font-mono"> ({selectedQrPass.studentRollNo})</span>
                )} • {selectedQrPass.college}
              </p>
              {selectedQrPass.teamMembers && (
                <p className="text-[11px] text-purple-300 font-mono mb-3">
                  Team Members + Roll Nos: {selectedQrPass.teamMembers}
                </p>
              )}

              {/* QR Code */}
              <div className="p-3 bg-white rounded-2xl inline-block mb-4 shadow-xl">
                {selectedQrPass.qrCodeDataUrl ? (
                  <img src={selectedQrPass.qrCodeDataUrl} alt="QR Badge" className="w-44 h-44 mx-auto" />
                ) : (
                  <div className="w-44 h-44 bg-slate-900 flex items-center justify-center">
                    <QrCode className="w-20 h-20 text-cyan-400" />
                  </div>
                )}
              </div>

              <div className="bg-purple-950/40 border border-purple-800/40 rounded-xl p-2.5 mb-4">
                <span className="text-[10px] font-mono text-purple-300 block uppercase">Verification Token</span>
                <span className="text-sm font-mono font-bold text-cyan-300 tracking-wider">
                  {selectedQrPass.qrToken || selectedQrPass.id}
                </span>
              </div>

              <div className="flex items-center justify-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase ${
                  selectedQrPass.checkedIn
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                }`}>
                  {selectedQrPass.checkedIn ? 'Turnstile Checked In' : 'Entry Authorized'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* IN-APP CONFIRM CANCEL / DELETE MODAL */}
        <ConfirmDeleteModal
          isOpen={deleteModalConfig.isOpen}
          title={deleteModalConfig.title}
          message={deleteModalConfig.message}
          itemName={deleteModalConfig.name}
          confirmText={deleteModalConfig.type === 'cancel' ? 'Yes, Cancel Registration' : 'Yes, Remove Record'}
          cancelText="Keep"
          onConfirm={handleConfirmAction}
          onCancel={() => setDeleteModalConfig(prev => ({ ...prev, isOpen: false }))}
        />
      </main>
    </div>
  );
};
