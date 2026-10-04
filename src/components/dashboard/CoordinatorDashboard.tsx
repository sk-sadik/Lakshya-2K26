import React, { useState, useEffect, useMemo } from 'react';
import { User, ManagedEvent, Registration, DepartmentId, EventCategory, UserRole, FoodCoupon, NotificationItem, SupportReport } from '../../types';
import { dbService } from '../../services/dbService';
import { DEPARTMENTS } from '../../data/lakshyaData';
import { SoundEngine } from '../AudioEngine';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Calendar, 
  Edit3, 
  Users, 
  UserCheck, 
  BarChart3, 
  User as UserIcon, 
  LogOut, 
  Search, 
  Filter, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Sparkles,
  Building2,
  Download,
  Clock,
  Eye,
  EyeOff,
  Lock,
  KeyRound,
  X,
  QrCode,
  Utensils,
  MailCheck,
  RefreshCw,
  MessageSquare,
  Bell
} from 'lucide-react';

import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { CoordinatorMessagesSection } from './CoordinatorMessagesSection';

interface CoordinatorDashboardProps {
  user: Omit<User, 'passwordHash'>;
  onLogout: () => void;
  onBackToWebsite: () => void;
  onUserUpdate: (updatedUser: Omit<User, 'passwordHash'>) => void;
  onSwitchRole?: (role: UserRole) => void;
  availableRoles?: UserRole[];
}

type CoordTab = 
  | 'dashboard'
  | 'add-event'
  | 'my-events'
  | 'manage-registrations'
  | 'participants'
  | 'food-coupons'
  | 'statistics'
  | 'messages'
  | 'profile';


// Future default registration deadline (+30 days) so events are never created as closed.
const defaultRegistrationDeadline = (): string => {
  const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} 11:59 PM`;
};

export const CoordinatorDashboard: React.FC<CoordinatorDashboardProps> = ({
  user,
  onLogout,
  onBackToWebsite,
  onUserUpdate,
  onSwitchRole,
  availableRoles = []
}) => {
  const [activeTab, setActiveTab] = useState<CoordTab>('dashboard');
  const [analytics, setAnalytics] = useState<any>(null);
  const [allEvents, setAllEvents] = useState<ManagedEvent[]>([]);

  // Add / Edit Event form state
  const [editingEvent, setEditingEvent] = useState<ManagedEvent | null>(null);
  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState<DepartmentId>((user.department as DepartmentId) || 'cse');
  const [category, setCategory] = useState<EventCategory>('technical');
  const [date, setDate] = useState('2026-03-20');
  const [time, setTime] = useState('10:00 AM - 01:00 PM');
  const [venue, setVenue] = useState('');
  const [deadline, setDeadline] = useState(defaultRegistrationDeadline);
  const [maxParticipants, setMaxParticipants] = useState<number>(80);
  const [entryFee, setEntryFee] = useState('₹150 / Team');
  const [registrationFee, setRegistrationFee] = useState('₹150 / Team');
  const [teamSize, setTeamSize] = useState('Team of 2');
  const [prizeFirst, setPrizeFirst] = useState('₹10,000');
  const [prizeSecond, setPrizeSecond] = useState('₹5,000');
  const [rulesInput, setRulesInput] = useState('All college IDs required\nFollow safety protocols\nBring laptops if coding round');
  
  // Feedback
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Participant search & filters
  const [participantSearch, setParticipantSearch] = useState('');
  const [participantEventFilter, setParticipantEventFilter] = useState('all');
  const [participantCollegeFilter, setParticipantCollegeFilter] = useState<'all' | 'lbrce' | 'other'>('all');

  // Selected participant for detail modal
  const [viewParticipant, setViewParticipant] = useState<Registration | null>(null);

  // Profile & Password settings
  const [profileName, setProfileName] = useState(user.name);
  const [profilePhone, setProfilePhone] = useState(user.phone || '');
  const [profileFacultyId, setProfileFacultyId] = useState(user.rollNo || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Food Coupon Verification & Redemption state
  const [couponLookupCode, setCouponLookupCode] = useState('');
  const [lookedUpCoupon, setLookedUpCoupon] = useState<FoodCoupon | null>(null);
  const [isVerifyingCoupon, setIsVerifyingCoupon] = useState(false);
  const [isRedeemingCoupon, setIsRedeemingCoupon] = useState(false);
  const [couponActionFeedback, setCouponActionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Food Coupon Management state
  const [coordFoodCoupons, setCoordFoodCoupons] = useState<FoodCoupon[]>([]);
  const [isSendingCouponEmail, setIsSendingCouponEmail] = useState(false);
  const [sendingCouponId, setSendingCouponId] = useState<string | null>(null);
  const [emailAllEventId, setEmailAllEventId] = useState<string>('all');
  const [isEmailingAllCoupons, setIsEmailingAllCoupons] = useState(false);

  // Notifications & Reports (admin -> coordinators only)
  const [coordNotifications, setCoordNotifications] = useState<NotificationItem[]>([]);
  const [coordReports, setCoordReports] = useState<SupportReport[]>([]);

  // Load data
  const loadData = async () => {
    const stats = dbService.getCoordinatorAnalytics(user.id, user.email);
    setAnalytics(stats);
    setAllEvents(stats.events);
    
    // Load food coupons
    try {
      const cpnData = await dbService.getAllFoodCoupons();
      setCoordFoodCoupons(cpnData.coupons || []);
    } catch {
      // fallback
    }

    // Load coordinator-targeted admin notifications + own reports
    try {
      const notifs = await dbService.getNotifications(user.id, 'coordinator');
      setCoordNotifications(notifs);
    } catch {
      // fallback
    }
    try {
      const allReports = await dbService.getReports();
      setCoordReports(allReports);
    } catch {
      // fallback
    }
  };

  const refreshMessages = async () => {
    try {
      const notifs = await dbService.getNotifications(user.id, 'coordinator');
      setCoordNotifications(notifs);
    } catch {}
    try {
      const allReports = await dbService.getReports();
      setCoordReports(allReports);
    } catch {}
  };

  // Unread admin notices targeted ONLY to coordinators (coordinator + system-wide)
  const coordUnreadNotices = useMemo(() => coordNotifications.filter(
    (n) => n.targetRole === 'coordinator' || (n as any).userId === 'coordinators' || n.targetRole === 'all' || (n as any).userId === 'all'
  ), [coordNotifications]);

  useEffect(() => {
    loadData();
  }, [user.id, user.email]);

  const resetForm = () => {
    setEditingEvent(null);
    setEventName('');
    setDescription('');
    setDepartment((user.department as DepartmentId) || 'cse');
    setCategory('technical');
    setDate('2026-03-20');
    setTime('10:00 AM - 01:00 PM');
    setVenue('');
    setDeadline(defaultRegistrationDeadline());
    setMaxParticipants(80);
    setEntryFee('₹150 / Team');
    setRegistrationFee('₹150 / Team');
    setTeamSize('Team of 2');
    setPrizeFirst('₹10,000');
    setPrizeSecond('₹5,000');
    setRulesInput('All college IDs required\nFollow safety protocols\nBring laptops if coding round');
    setFormSuccess(null);
    setFormError(null);
  };

  const handleStartEdit = (event: ManagedEvent) => {
    SoundEngine.playClick();
    setEditingEvent(event);
    setEventName(event.eventName);
    setDescription(event.description);
    setDepartment(event.department);
    setCategory(event.category);
    setDate(event.date);
    setTime(event.time);
    setVenue(event.venue);
    setDeadline(event.registrationDeadline);
    setMaxParticipants(event.maxParticipants);
    setEntryFee(event.entryFee);
    setRegistrationFee(event.registrationFee || event.entryFee);
    setTeamSize(event.teamSize);
    setPrizeFirst(event.prizes.first);
    setPrizeSecond(event.prizes.second);
    setRulesInput(event.rules ? event.rules.join('\n') : '');
    setActiveTab('add-event');
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSuccess(null);
    setFormError(null);

    if (!eventName.trim() || !description.trim() || !venue.trim()) {
      setFormError('Please fill in Event Name, Description, and Venue.');
      return;
    }

    const rulesArray = rulesInput
      .split('\n')
      .map(r => r.trim())
      .filter(Boolean);

    try {
      if (editingEvent) {
        // Edit existing
        await dbService.updateEvent(editingEvent.id, {
          eventName,
          description,
          department,
          category,
          date,
          time,
          venue,
          registrationDeadline: deadline,
          maxParticipants: Number(maxParticipants) || 100,
          entryFee,
          registrationFee,
          teamSize,
          prizes: {
            first: prizeFirst,
            second: prizeSecond
          },
          rules: rulesArray
        });
        SoundEngine.playSuccess();
        setFormSuccess(`Event "${eventName}" updated successfully!`);
      } else {
        // Add new
        await dbService.createEvent({
          eventName,
          description,
          department,
          category,
          coordinator: user.id,
          coordinatorName: user.name,
          coordinatorEmail: user.email,
          date,
          time,
          venue,
          registrationDeadline: deadline,
          maxParticipants: Number(maxParticipants) || 80,
          entryFee,
          registrationFee,
          teamSize,
          prizes: {
            first: prizeFirst,
            second: prizeSecond
          },
          status: 'upcoming',
          approvalStatus: 'approved',
          rules: rulesArray
        });
        SoundEngine.playSuccess();
        setFormSuccess(`Event "${eventName}" published successfully!`);
      }

      await loadData();
      setTimeout(() => {
        resetForm();
        setActiveTab('my-events');
      }, 1200);
    } catch (err: any) {
      console.error('[Event Save Error]', err);
      setFormError(err.message || 'Operation failed.');
    }
  };

  // Check-in state
  const [checkInToken, setCheckInToken] = useState('');
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInResult, setCheckInResult] = useState<{ success: boolean; message: string } | null>(null);

  const handlePerformCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInToken.trim()) return;
    setCheckInResult(null);
    setIsCheckingIn(true);
    try {
      const res = await dbService.checkInAttendee(checkInToken.trim());
      SoundEngine.playSuccess();
      setCheckInResult({ success: true, message: res.message });
      setCheckInToken('');
      loadData();
    } catch (err: any) {
      setCheckInResult({ success: false, message: err.message || 'Check-in failed.' });
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Delete / Cancellation Modal Configuration
  const [deleteModalConfig, setDeleteModalConfig] = useState<{
    isOpen: boolean;
    type: 'event' | 'registration';
    id: string;
    name: string;
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'event',
    id: '',
    name: '',
    title: '',
    message: '',
  });

  const [coordinatorToast, setCoordinatorToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setCoordinatorToast({ message, type });
    setTimeout(() => setCoordinatorToast(null), 4000);
  };

  const requestDeleteEvent = (id: string, name: string) => {
    SoundEngine.playClick();
    setDeleteModalConfig({
      isOpen: true,
      type: 'event',
      id,
      name,
      title: 'Delete / Cancel Festival Event',
      message: `Are you sure you want to permanently delete event "${name}"? This action will remove the event and notify registered participants.`
    });
  };

  const requestCancelRegistration = (id: string, studentName: string, eventName: string) => {
    SoundEngine.playClick();
    setDeleteModalConfig({
      isOpen: true,
      type: 'registration',
      id,
      name: `${studentName} (${eventName})`,
      title: 'Cancel Student Registration',
      message: `Are you sure you want to cancel the registration token "${id}" for student "${studentName}"?`
    });
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

    setIsSavingProfile(true);
    try {
      const updated = await dbService.updateUser(user.id, {
        name: profileName.trim() || user.name,
        phone: profilePhone.trim() || undefined,
        rollNo: profileFacultyId.trim() || undefined,
        newPassword: newPassword.trim() || undefined
      });
      SoundEngine.playSuccess();
      setProfileSuccess(newPassword ? 'Password and profile updated successfully!' : 'Profile details updated successfully!');
      onUserUpdate(updated);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleConfirmDelete = () => {
    try {
      if (deleteModalConfig.type === 'event') {
        dbService.deleteEvent(deleteModalConfig.id);
        SoundEngine.playSuccess();
        showToast(`Event "${deleteModalConfig.name}" was successfully deleted.`, 'success');
      } else if (deleteModalConfig.type === 'registration') {
        dbService.cancelRegistration(deleteModalConfig.id);
        SoundEngine.playSuccess();
        showToast(`Registration "${deleteModalConfig.id}" was cancelled.`, 'success');
      }
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Action failed.', 'error');
    } finally {
      setDeleteModalConfig(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleDeleteEvent = (id: string, name: string) => {
    requestDeleteEvent(id, name);
  };

  // Filtered participants list for coordinator's events
  const participants = useMemo(() => {
    if (!analytics) return [];
    return (analytics.participants as Registration[]).filter((p) => {
      const matchSearch = p.studentName.toLowerCase().includes(participantSearch.toLowerCase()) ||
                          p.studentEmail.toLowerCase().includes(participantSearch.toLowerCase()) ||
                          p.college.toLowerCase().includes(participantSearch.toLowerCase()) ||
                          p.id.toLowerCase().includes(participantSearch.toLowerCase());
      const matchEvent = participantEventFilter === 'all' || p.eventId === participantEventFilter;
      const isLBRCE = p.college.includes('Lakireddy Bali Reddy');
      const matchCollege = participantCollegeFilter === 'all' || 
                           (participantCollegeFilter === 'lbrce' && isLBRCE) ||
                           (participantCollegeFilter === 'other' && !isLBRCE);
      return matchSearch && matchEvent && matchCollege;
    });
  }, [analytics, participantSearch, participantEventFilter, participantCollegeFilter]);

  // Chart data
  const lbrceVsOtherData = useMemo(() => {
    if (!analytics) return [];
    return [
      { name: 'LBRCE Students', value: analytics.lbrceCount, fill: '#ec4899' },
      { name: 'Other Colleges', value: analytics.otherCount, fill: '#06b6d4' }
    ];
  }, [analytics]);

  const COLORS = ['#ec4899', '#06b6d4', '#a855f7', '#3b82f6', '#10b981'];

  return (
    <div className="min-h-screen bg-[#070415] text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-950/95 border-b md:border-b-0 md:border-r border-purple-900/40 p-4 flex flex-col shrink-0">
        {/* Brand */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-purple-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-600/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-heading font-extrabold text-white text-base tracking-wider block">
                LAKSHYA 2026
              </span>
              <span className="text-[10px] font-mono text-purple-400 uppercase font-semibold">
                Coordinator Console
              </span>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-800/40 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-500/40 text-purple-300 flex items-center justify-center font-bold text-sm">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <span className="text-sm font-bold text-white block truncate">{user.name}</span>
              <span className="text-[10px] font-mono text-cyan-400 block truncate">
                Dept: {user.department.toUpperCase()} • Coordinator
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 flex-1">
          <button
            onClick={() => { SoundEngine.playClick(); setActiveTab('dashboard'); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => {
              SoundEngine.playClick();
              resetForm();
              setActiveTab('add-event');
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'add-event' && !editingEvent
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Event</span>
          </button>

          <button
            onClick={() => { SoundEngine.playClick(); setActiveTab('my-events'); }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'my-events' || (activeTab === 'add-event' && editingEvent)
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4" />
              <span>My Events</span>
            </div>
            {allEvents.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold">
                {allEvents.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { SoundEngine.playClick(); setActiveTab('manage-registrations'); }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'manage-registrations'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4" />
              <span>Manage Registrations</span>
            </div>
            {analytics?.totalRegistrations > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-mono text-[10px] font-bold">
                {analytics.totalRegistrations}
              </span>
            )}
          </button>

          <button
            onClick={() => { SoundEngine.playClick(); setActiveTab('participants'); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'participants'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Participants</span>
          </button>

          <button
            onClick={() => { SoundEngine.playClick(); setActiveTab('food-coupons'); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'food-coupons'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <Utensils className="w-4 h-4 text-emerald-400" />
            <span>Food Pass Scanner</span>
          </button>

          <button
            onClick={() => { SoundEngine.playClick(); setActiveTab('statistics'); }}

            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'statistics'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Event Statistics</span>
          </button>

          <button
            onClick={() => { SoundEngine.playClick(); setActiveTab('messages'); }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'messages'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4" />
              <span>Notifications</span>
            </div>
            {coordUnreadNotices.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold border border-cyan-500/40 flex items-center gap-1">
                <Bell className="w-3 h-3" />
                {coordUnreadNotices.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { SoundEngine.playClick(); setActiveTab('profile'); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Profile</span>
          </button>
        </nav>

        {/* Host Campus Badge */}
        <div className="pt-3 my-2 border-t border-purple-950">
          <div className="relative rounded-xl overflow-hidden border border-purple-900/50 group">
            <div className="h-16 w-full overflow-hidden">
              <img
                src="/assets/lbrce_campus.jpg"
                alt="LBRCE Campus"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
            </div>
            <div className="p-2 bg-slate-950/95 text-[10px] font-mono">
              <span className="text-pink-400 font-bold block truncate">LBRCE Mylavaram</span>
              <span className="text-slate-400 block truncate">Host Campus Arena</span>
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="pt-4 mt-4 border-t border-purple-950 space-y-2">
          <button
            onClick={() => { SoundEngine.playClick(); onBackToWebsite(); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono text-purple-300 hover:text-white hover:bg-purple-950/40 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
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

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
        {/* In-App Toast Banner */}
        {coordinatorToast && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-mono font-bold shadow-xl border animate-in fade-in slide-in-from-top-2 duration-200 ${
            coordinatorToast.type === 'success' 
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' 
              : 'bg-red-950/80 border-red-500/50 text-red-300'
          }`}>
            <div className="flex items-center gap-2.5">
              {coordinatorToast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
              <span>{coordinatorToast.message}</span>
            </div>
            <button onClick={() => setCoordinatorToast(null)} className="p-1 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Multi-Role Quick Switcher Banner */}
        {availableRoles && availableRoles.length > 1 && onSwitchRole && (
          <div className="mb-6 p-3 rounded-2xl bg-gradient-to-r from-purple-950/60 to-slate-900 border border-purple-800/40 flex flex-wrap items-center justify-between gap-3 text-xs backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="font-mono text-purple-200">
                Active Console: <strong className="text-white">Event Co-ordinator</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400">Switch View:</span>
              {availableRoles.map((r) => (
                <button
                  key={r}
                  onClick={() => onSwitchRole(r)}
                  className={`px-3 py-1 rounded-xl text-xs font-tech font-bold uppercase transition-all cursor-pointer ${
                    r === 'coordinator'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-purple-900/50'
                  }`}
                >
                  {r === 'admin' ? '👑 Admin' : r === 'coordinator' ? '📋 Coordinator' : '🎓 Student'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === 'dashboard' && analytics && (
          <div className="space-y-8">
            <div>
              <span className="text-xs font-mono uppercase text-purple-400 tracking-wider font-semibold block mb-1">
                Department Coordination Console
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                {user.name} ({user.department.toUpperCase()})
              </h1>
              <p className="text-xs sm:text-sm text-slate-300">
                Real-time tracking of managed events, registrations, participant colleges, and live check-in capacity.
              </p>
            </div>

            {/* Dynamic Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-purple-900/50">
                <span className="text-[11px] font-mono text-purple-300 uppercase block mb-1">My Events</span>
                <span className="text-3xl font-tech font-extrabold text-white">
                  {analytics.totalEvents}
                </span>
                <span className="text-[10px] font-mono text-slate-400 block mt-1">
                  Assigned & Managed
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-purple-900/50">
                <span className="text-[11px] font-mono text-pink-300 uppercase block mb-1">Total Registrations</span>
                <span className="text-3xl font-tech font-extrabold text-pink-400">
                  {analytics.totalRegistrations}
                </span>
                <span className="text-[10px] font-mono text-slate-400 block mt-1">
                  Enrolled Students
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-purple-900/50">
                <span className="text-[11px] font-mono text-cyan-300 uppercase block mb-1">LBRCE Students</span>
                <span className="text-3xl font-tech font-extrabold text-cyan-400">
                  {analytics.lbrceCount}
                </span>
                <span className="text-[10px] font-mono text-slate-400 block mt-1">
                  Internal Participation
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-purple-900/50">
                <span className="text-[11px] font-mono text-emerald-300 uppercase block mb-1">Other Colleges</span>
                <span className="text-3xl font-tech font-extrabold text-emerald-400">
                  {analytics.otherCount}
                </span>
                <span className="text-[10px] font-mono text-slate-400 block mt-1">
                  {analytics.participatingCollegesCount} External Institutes
                </span>
              </div>
            </div>

            {/* Charts section: LBRCE vs Other Colleges & Event Registrations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LBRCE vs Other Colleges Donut Chart */}
              <div className="p-6 rounded-3xl bg-slate-950/80 border border-purple-900/40">
                <h3 className="font-heading font-bold text-base text-white mb-2">
                  College Participation Breakdown
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Internal LBRCE students vs. visiting external colleges.
                </p>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={lbrceVsOtherData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {lbrceVsOtherData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f0826', borderColor: '#6b21a8', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Event Registrations Bar Chart */}
              <div className="p-6 rounded-3xl bg-slate-950/80 border border-purple-900/40">
                <h3 className="font-heading font-bold text-base text-white mb-2">
                  Event-Wise Registration Load
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Capacity and enrollment across your assigned events.
                </p>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.eventBreakdown}>
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f0826', borderColor: '#6b21a8', borderRadius: '12px' }}
                      />
                      <Bar dataKey="registrations" fill="#a855f7" radius={[6, 6, 0, 0]} name="Registrations" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  resetForm();
                  setActiveTab('add-event');
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white text-xs font-tech font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/30"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Publish New Event</span>
              </button>

              <button
                onClick={() => setActiveTab('participants')}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-purple-800/40 text-purple-200 text-xs font-tech font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span>Search Participants</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: ADD / EDIT EVENT */}
        {activeTab === 'add-event' && (
          <div className="max-w-3xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                  {editingEvent ? `Edit Event: ${editingEvent.eventName}` : 'Publish New Symposium Event'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  Configure competition rules, prize vault, venue, and participant capacity.
                </p>
              </div>

              {editingEvent && (
                <button
                  onClick={resetForm}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 text-xs font-mono text-slate-400 hover:text-white"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {formSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{formSuccess}</span>
              </div>
            )}

            {formError && (
              <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEvent} className="p-6 sm:p-8 rounded-3xl bg-slate-950/80 border border-purple-900/40 space-y-5">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Event Name *
                </label>
                <input
                  required
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g. Autonomous Maze Runner / Cloud Sprint"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Description & Overview *
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide an overview of the event, challenge statements, and criteria..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as DepartmentId)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-purple-500"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as EventCategory)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-purple-500"
                  >
                    <option value="technical">Technical</option>
                    <option value="coding">Coding & Software</option>
                    <option value="robotics">Robotics</option>
                    <option value="gaming">Gaming</option>
                    <option value="paper">Paper & Design</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Time / Slot
                  </label>
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="10:00 AM - 01:00 PM"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Venue *
                  </label>
                  <input
                    required
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="Lab 204 / Seminar Hall"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Registration Deadline
                  </label>
                  <input
                    type="text"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    placeholder="YYYY-MM-DD HH:MM AM/PM"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Max Participants
                  </label>
                  <input
                    type="number"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Entry Fee
                  </label>
                  <input
                    type="text"
                    value={entryFee}
                    onChange={(e) => setEntryFee(e.target.value)}
                    placeholder="₹150 / Team or Free"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Registration Fee
                  </label>
                  <input
                    type="text"
                    value={registrationFee}
                    onChange={(e) => setRegistrationFee(e.target.value)}
                    placeholder="₹150 / Team or Free"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Team Size
                  </label>
                  <input
                    type="text"
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value)}
                    placeholder="Individual (1) or Team of 2"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    1st Prize Award
                  </label>
                  <input
                    type="text"
                    value={prizeFirst}
                    onChange={(e) => setPrizeFirst(e.target.value)}
                    placeholder="₹10,000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    2nd Prize Award
                  </label>
                  <input
                    type="text"
                    value={prizeSecond}
                    onChange={(e) => setPrizeSecond(e.target.value)}
                    placeholder="₹5,000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Rules & Evaluation Criteria (One per line)
                </label>
                <textarea
                  rows={4}
                  value={rulesInput}
                  onChange={(e) => setRulesInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 text-white font-tech text-sm font-bold uppercase tracking-wider shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{editingEvent ? 'Update Event Record' : 'Publish Symposium Event'}</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: MY EVENTS */}
        {activeTab === 'my-events' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                  Events Managed by Me
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  {allEvents.length} events assigned to your coordination account.
                </p>
              </div>

              <button
                onClick={() => {
                  resetForm();
                  setActiveTab('add-event');
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-tech font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Event</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {allEvents.map((ev) => {
                const registeredCount = (analytics?.participants || []).filter((p: Registration) => p.eventId === ev.id).length;
                return (
                  <div
                    key={ev.id}
                    className="p-5 rounded-3xl bg-slate-950/80 border border-purple-900/40 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono text-xs uppercase">
                          {ev.department.toUpperCase()}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                          ev.status === 'upcoming' ? 'bg-cyan-500/20 text-cyan-300' :
                          ev.status === 'ongoing' ? 'bg-amber-500/20 text-amber-300 animate-pulse' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {ev.status}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-white mb-1.5">{ev.eventName}</h3>
                      <p className="text-xs text-slate-300 line-clamp-2 mb-4">{ev.description}</p>

                      <div className="p-3 rounded-2xl bg-purple-950/20 border border-purple-900/30 text-xs font-mono space-y-1 mb-4">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Registrations:</span>
                          <span className="text-pink-300 font-bold">{registeredCount} / {ev.maxParticipants}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Venue & Time:</span>
                          <span className="text-white">{ev.venue} ({ev.time})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">1st Prize:</span>
                          <span className="text-emerald-400 font-bold">{ev.prizes.first}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-purple-950">
                      <button
                        onClick={() => handleStartEdit(ev)}
                        className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-purple-300 text-xs font-tech font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => {
                          setParticipantEventFilter(ev.id);
                          setActiveTab('participants');
                        }}
                        className="flex-1 py-2 rounded-xl bg-purple-950/50 hover:bg-purple-900/50 text-cyan-300 text-xs font-tech font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Participants</span>
                      </button>

                      <button
                        onClick={() => handleDeleteEvent(ev.id, ev.eventName)}
                        className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-400 cursor-pointer"
                        title="Delete / Cancel Event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: MANAGE REGISTRATIONS & TAB 5: PARTICIPANTS */}
        {(activeTab === 'manage-registrations' || activeTab === 'participants') && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                  {activeTab === 'manage-registrations' ? 'Manage Event Registrations' : 'Event Participants'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  Search, filter, and inspect registered students for your department events.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-purple-300">
                <span className="px-3 py-1.5 rounded-xl bg-purple-950/50 border border-purple-800/40">
                  Showing {participants.length} Registrations
                </span>
              </div>
            </div>

            {/* Turnstile / QR Pass Check-in Scanner */}
            <form onSubmit={handlePerformCheckIn} className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/60 flex flex-col sm:flex-row items-center gap-3">
              <div className="flex items-center gap-2 text-pink-400 font-mono text-xs font-bold shrink-0">
                <QrCode className="w-5 h-5 text-cyan-400" />
                <span>Turnstile Scanner / Check-in:</span>
              </div>
              <input
                type="text"
                value={checkInToken}
                onChange={(e) => setCheckInToken(e.target.value)}
                placeholder="Scan or enter QR token (e.g. LAKSHYA-...) or Reg ID"
                className="flex-1 w-full px-4 py-2 rounded-xl bg-slate-950 border border-purple-900/60 text-white text-xs font-mono focus:border-cyan-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isCheckingIn || !checkInToken.trim()}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-tech text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isCheckingIn ? 'Verifying...' : 'Verify & Check In'}
              </button>
            </form>

            {checkInResult && (
              <div className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                checkInResult.success
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                  : 'bg-red-950/60 border-red-500/50 text-red-200'
              }`}>
                {checkInResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
                <span>{checkInResult.message}</span>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  placeholder="Search by student name, email, roll no, or college..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Event selector */}
              <select
                value={participantEventFilter}
                onChange={(e) => setParticipantEventFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-purple-900/60 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Managed Events</option>
                {allEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.eventName}
                  </option>
                ))}
              </select>

              {/* College Filter */}
              <select
                value={participantCollegeFilter}
                onChange={(e) => setParticipantCollegeFilter(e.target.value as any)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-purple-900/60 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Colleges</option>
                <option value="lbrce">LBRCE Students Only</option>
                <option value="other">Other Colleges Only</option>
              </select>
            </div>

            {/* Participants Table */}
            <div className="rounded-3xl bg-slate-950/80 border border-purple-900/40 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-xs font-sans">
                  <thead className="bg-purple-950/40 text-purple-300 font-mono text-[11px] uppercase border-b border-purple-900/50">
                    <tr>
                      <th className="p-4">Reg ID</th>
                      <th className="p-4">Student Name</th>
                      <th className="p-4">College / Institute</th>
                      <th className="p-4">Event</th>
                      <th className="p-4">Payment</th>
                      <th className="p-4">Registered Date</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-950/60">
                    {participants.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          No matching participants found for the selected filters.
                        </td>
                      </tr>
                    ) : (
                      participants.map((p) => {
                        const isLBRCE = p.college.includes('Lakireddy Bali Reddy');
                        return (
                          <tr key={p.id} className="hover:bg-purple-950/20 transition-colors">
                            <td className="p-4 font-mono font-bold text-cyan-400">{p.id}</td>
                            <td className="p-4">
                              <span className="font-bold text-white block">{p.studentName}</span>
                              <span className="text-[11px] text-slate-400">{p.studentEmail}</span>
                            </td>
                            <td className="p-4">
                              <span className="text-slate-200 block truncate max-w-xs">{p.college}</span>
                              <span className={`text-[10px] font-mono uppercase font-bold ${
                                isLBRCE ? 'text-pink-400' : 'text-cyan-400'
                              }`}>
                                {isLBRCE ? 'LBRCE Internal' : 'External College'}
                              </span>
                            </td>
                            <td className="p-4 font-medium text-purple-200">{p.eventName}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                p.paymentStatus === 'PAID'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : p.paymentStatus === 'PENDING'
                                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                                  : p.paymentStatus === 'FREE'
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                  : 'bg-red-500/20 text-red-300 border border-red-500/40'
                              }`}>
                                {p.paymentStatus}
                              </span>
                              {p.paymentAmount && Number(p.paymentAmount) > 0 ? (
                                <span className="text-[10px] text-slate-400 block mt-1">₹{p.paymentAmount}</span>
                              ) : p.paymentStatus === 'FREE' ? (
                                <span className="text-[10px] text-cyan-400/70 block mt-1">Free Entry</span>
                              ) : null}
                            </td>
                            <td className="p-4 font-mono text-slate-400">
                              {new Date(p.registrationDate).toLocaleDateString()}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                p.status === 'confirmed'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-red-500/20 text-red-300 border border-red-500/40'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-1.5">
                              <button
                                onClick={() => setViewParticipant(p)}
                                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-purple-300 text-xs font-mono cursor-pointer"
                              >
                                View
                              </button>
                              {p.status === 'confirmed' && (
                                <button
                                  onClick={() => requestCancelRegistration(p.id, p.studentName, p.eventName)}
                                  className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 cursor-pointer inline-flex items-center justify-center align-middle"
                                  title="Cancel Registration"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: EVENT STATISTICS */}
        {activeTab === 'statistics' && analytics && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                Event Registration Statistics
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                In-depth metrics on student origins, college distributions, and capacity utilization.
              </p>
            </div>

            {/* College-wise distribution list */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-3xl bg-slate-950/80 border border-purple-900/40">
                <h3 className="font-heading font-bold text-base text-white mb-3">
                  College-Wise Participation (My Events)
                </h3>
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-2">
                  {(analytics.collegeBreakdown || []).map((col: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-purple-950/20 border border-purple-900/30 flex items-center justify-between"
                    >
                      <span className="text-xs text-slate-200 font-medium truncate max-w-xs">
                        {col.fullName}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 font-mono text-xs font-bold">
                        {col.count} Students
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-slate-950/80 border border-purple-900/40">
                <h3 className="font-heading font-bold text-base text-white mb-3">
                  Summary Report
                </h3>
                <div className="space-y-3 text-xs font-mono">
                  <div className="flex justify-between p-3 rounded-xl bg-slate-900/60">
                    <span className="text-slate-400">Total Events Managed:</span>
                    <span className="text-white font-bold">{analytics.totalEvents}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl bg-slate-900/60">
                    <span className="text-slate-400">Total Enrolled Registrations:</span>
                    <span className="text-pink-400 font-bold">{analytics.totalRegistrations}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl bg-slate-900/60">
                    <span className="text-slate-400">LBRCE Internal Students:</span>
                    <span className="text-cyan-400 font-bold">{analytics.lbrceCount}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl bg-slate-900/60">
                    <span className="text-slate-400">Other College Students:</span>
                    <span className="text-emerald-400 font-bold">{analytics.otherCount}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl bg-slate-900/60">
                    <span className="text-slate-400">External Colleges Represented:</span>
                    <span className="text-purple-300 font-bold">{analytics.participatingCollegesCount} Institutions</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: FOOD PASS SCANNER & REDEMPTION */}
        {activeTab === 'food-coupons' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight flex items-center gap-3">
                <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Utensils className="w-6 h-6" />
                </span>
                Food Pass Management & Email Distribution
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                View and manage food passes generated by admin, and send them to participants via email for on-site redemption.
              </p>
            </div>

            {/* Email All Passes (After Admin Releases Tokens) */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#07271c] via-slate-950 to-[#0a1526] border border-emerald-500/50 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 max-w-4xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-mono font-bold text-emerald-300">
                  <MailCheck className="w-3.5 h-3.5 text-emerald-400" />
                  BULK EMAIL DISTRIBUTION
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-heading">
                  Email All Food Passes to Participants
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Once the admin releases the food tokens for confirmed event participants, coordinators can dispatch every pass directly to the participant's mailbox with a single action.
                </p>

                <div className="pt-1 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <select
                    value={emailAllEventId}
                    onChange={(e) => setEmailAllEventId(e.target.value)}
                    className="px-4 py-3 rounded-2xl bg-slate-900 border border-emerald-900/60 text-white text-xs font-mono focus:outline-none focus:border-emerald-400 cursor-pointer"
                  >
                    <option value="all">All Events (All Issued Passes)</option>
                    {allEvents.map((ev) => (
                      <option key={ev.id} value={ev.id}>{ev.eventName}</option>
                    ))}
                  </select>

                  <button
                    onClick={async () => {
                      if (coordFoodCoupons.length === 0) {
                        setCouponActionFeedback({
                          type: 'error',
                          text: 'No food passes issued yet. Ask the admin to release tokens for confirmed participants first.',
                        });
                        return;
                      }
                      setCouponActionFeedback(null);
                      setIsEmailingAllCoupons(true);
                      try {
                        const res = await dbService.sendCouponEmailsToParticipants(
                          emailAllEventId === 'all' ? undefined : emailAllEventId
                        );
                        SoundEngine.playSuccess();
                        setCouponActionFeedback({
                          type: 'success',
                          text: res.message,
                        });
                      } catch (err: any) {
                        SoundEngine.playClick();
                        setCouponActionFeedback({
                          type: 'error',
                          text: err.message || 'Failed to email food passes.',
                        });
                      } finally {
                        setIsEmailingAllCoupons(false);
                      }
                    }}
                    disabled={isEmailingAllCoupons}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500 text-white font-tech font-extrabold text-xs uppercase tracking-wider shadow-xl shadow-emerald-600/30 flex items-center gap-2.5 cursor-pointer disabled:opacity-50 transition-all hover:scale-[1.02]"
                  >
                    <MailCheck className="w-4 h-4" />
                    <span>{isEmailingAllCoupons ? 'Emailing All Passes...' : 'Email All Passes'}</span>
                  </button>

                  <span className="text-[11px] font-mono text-slate-400">
                    {coordFoodCoupons.length} issued pass(es) ready to dispatch
                  </span>
                </div>
              </div>
            </div>

            {/* Feedback Alert */}
            {couponActionFeedback && (
              <div
                className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm animate-in fade-in duration-200 ${
                  couponActionFeedback.type === 'success'
                    ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-200'
                    : 'bg-red-950/80 border border-red-500/50 text-red-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {couponActionFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                  )}
                  <span>{couponActionFeedback.text}</span>
                </div>
                <button
                  onClick={() => setCouponActionFeedback(null)}
                  className="p-1 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Lookup / Scan Box */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-950/90 border border-emerald-900/40 shadow-xl space-y-4">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 block">
                Enter Attendee Coupon Code
              </label>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!couponLookupCode.trim()) return;
                  setCouponActionFeedback(null);
                  setIsVerifyingCoupon(true);
                  try {
                    const res = await dbService.verifyFoodCoupon(couponLookupCode.trim());
                    setLookedUpCoupon(res.coupon);
                    SoundEngine.playClick();
                    if (res.isValid) {
                      setCouponActionFeedback({
                        type: 'success',
                        text: `Valid Active Coupon for ${res.coupon.userName}! Ready to redeem.`,
                      });
                    } else {
                      setCouponActionFeedback({
                        type: 'error',
                        text: `Coupon status: ${res.status}. ${res.status === 'USED' ? 'Already redeemed!' : 'Cannot redeem.'}`,
                      });
                    }
                  } catch (err: any) {
                    SoundEngine.playClick();
                    setLookedUpCoupon(null);
                    setCouponActionFeedback({
                      type: 'error',
                      text: err.message || 'Coupon not found.',
                    });
                  } finally {
                    setIsVerifyingCoupon(false);
                  }
                }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <div className="relative flex-1">
                  <Utensils className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={couponLookupCode}
                    onChange={(e) => setCouponLookupCode(e.target.value.toUpperCase())}
                    placeholder="e.g. LAKSHYA-FOOD-A1B2C3"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-900 border border-emerald-900/60 text-white font-mono text-base tracking-wider uppercase focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isVerifyingCoupon || !couponLookupCode.trim()}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-tech font-bold uppercase tracking-wider text-xs shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50 shrink-0 flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  <span>{isVerifyingCoupon ? 'Verifying...' : 'Look Up Pass'}</span>
                </button>
              </form>
            </div>

            {/* Issued Food Passes (Generated by Admin) */}
            <div className="rounded-3xl bg-slate-950/80 border border-emerald-900/40 overflow-hidden shadow-xl">
              <div className="p-5 border-b border-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-emerald-400" />
                    Issued Food Passes (Generated by Admin)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Review tokens generated by the admin and email each pass directly to the participant's mailbox.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    SoundEngine.playClick();
                    try {
                      const cpnData = await dbService.getAllFoodCoupons();
                      setCoordFoodCoupons(cpnData.coupons || []);
                    } catch {}
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 border border-emerald-900/50 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-mono flex items-center gap-2 cursor-pointer self-start"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Refresh List</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-xs font-sans">
                  <thead className="bg-purple-950/40 text-purple-300 font-mono text-[11px] uppercase border-b border-purple-900/50">
                    <tr>
                      <th className="p-4">Coupon Code</th>
                      <th className="p-4">Participant</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-950/50 font-mono">
                    {coordFoodCoupons.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 font-sans">
                          No food passes generated by admin yet. Ask the admin to generate tokens for confirmed event participants.
                        </td>
                      </tr>
                    ) : (
                      coordFoodCoupons.map((c) => {
                        const cpnId = c.id || c.couponCode;
                        const isSendingThis = isSendingCouponEmail && sendingCouponId === cpnId;
                        return (
                          <tr key={cpnId} className="hover:bg-purple-950/20 transition-colors">
                            <td className="p-4 font-bold text-emerald-300">{c.couponCode}</td>
                            <td className="p-4 font-sans font-medium text-white">{c.userName}</td>
                            <td className="p-4 text-slate-300">{c.userEmail}</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                c.status === 'ACTIVE'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : c.status === 'USED'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                  : 'bg-red-500/20 text-red-300 border border-red-500/40'
                              }`}>
                                {c.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              {c.status === 'ACTIVE' ? (
                                <button
                                  onClick={async () => {
                                    setSendingCouponId(cpnId);
                                    setIsSendingCouponEmail(true);
                                    try {
                                      const res = await dbService.sendFoodCouponEmail(cpnId);
                                      SoundEngine.playSuccess();
                                      setCouponActionFeedback({
                                        type: 'success',
                                        text: `Food pass emailed to ${c.userEmail}!`,
                                      });
                                    } catch (err: any) {
                                      SoundEngine.playClick();
                                      setCouponActionFeedback({
                                        type: 'error',
                                        text: err.message || 'Failed to email food pass.',
                                      });
                                    } finally {
                                      setIsSendingCouponEmail(false);
                                      setSendingCouponId(null);
                                    }
                                  }}
                                  disabled={isSendingThis}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white text-[10px] font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
                                >
                                  <MailCheck className="w-3.5 h-3.5" />
                                  <span>{isSendingThis ? 'Sending...' : 'Email Pass'}</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-500">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Display Looked Up Coupon */}
            {lookedUpCoupon && (
              <div className="p-6 sm:p-8 rounded-3xl bg-slate-950/90 border border-emerald-500/40 space-y-6 animate-in slide-in-from-bottom-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-emerald-950">
                  <div>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold uppercase tracking-widest block">
                      VERIFIED DINING PASS RECORD
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
                      {lookedUpCoupon.userName}
                    </h3>
                    <p className="text-xs text-slate-300">
                      {lookedUpCoupon.userEmail} • {lookedUpCoupon.college.split(' (')[0]}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-4 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                        lookedUpCoupon.status === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : lookedUpCoupon.status === 'USED'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : 'bg-red-500/20 text-red-300 border border-red-500/40'
                      }`}
                    >
                      STATUS: {lookedUpCoupon.status}
                    </span>
                    
                    {lookedUpCoupon.status === 'ACTIVE' && (
                      <button
                        onClick={async () => {
                          setSendingCouponId(lookedUpCoupon.id);
                          setIsSendingCouponEmail(true);
                          try {
                            const res = await dbService.sendFoodCouponEmail(lookedUpCoupon.id);
                            SoundEngine.playSuccess();
                            setCouponActionFeedback({
                              type: 'success',
                              text: `Food pass emailed to ${lookedUpCoupon.userEmail}!`,
                            });
                          } catch (err: any) {
                            setCouponActionFeedback({
                              type: 'error',
                              text: err.message || 'Failed to email food pass.',
                            });
                          } finally {
                            setIsSendingCouponEmail(false);
                            setSendingCouponId(null);
                          }
                        }}
                        disabled={isSendingCouponEmail}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <MailCheck className="w-4 h-4" />
                        <span>{isSendingCouponEmail ? 'Sending...' : 'Send to Email'}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-950">
                    <span className="text-slate-400 block mb-1">Coupon Code</span>
                    <span className="font-mono text-emerald-300 font-bold text-base block">{lookedUpCoupon.couponCode}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-950">
                    <span className="text-slate-400 block mb-1">Meal Description</span>
                    <span className="text-white font-semibold block">{lookedUpCoupon.mealType}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-950">
                    <span className="text-slate-400 block mb-1">Venue</span>
                    <span className="text-white font-semibold block">{lookedUpCoupon.venue}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-950">
                    <span className="text-slate-400 block mb-1">Expiry Date</span>
                    <span className="text-slate-300 font-semibold block">
                      {new Date(lookedUpCoupon.expiryDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {lookedUpCoupon.status === 'ACTIVE' ? (
                  <div className="pt-2">
                    <button
                      onClick={async () => {
                        setCouponActionFeedback(null);
                        setIsRedeemingCoupon(true);
                        try {
                          const res = await dbService.redeemFoodCoupon(lookedUpCoupon.couponCode, user.name);
                          SoundEngine.playSuccess();
                          setLookedUpCoupon(res.coupon);
                          setCouponActionFeedback({
                            type: 'success',
                            text: `Success! Coupon ${res.coupon.couponCode} marked USED. Meal authorized for ${res.coupon.userName}.`,
                          });
                        } catch (err: any) {
                          SoundEngine.playClick();
                          setCouponActionFeedback({
                            type: 'error',
                            text: err.message || 'Failed to redeem coupon.',
                          });
                        } finally {
                          setIsRedeemingCoupon(false);
                        }
                      }}
                      disabled={isRedeemingCoupon}
                      className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500 text-white font-tech font-extrabold uppercase tracking-wider text-xs shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                      <span>{isRedeemingCoupon ? 'Authorizing Redemption...' : 'Authorize & Redeem Meal Pass'}</span>
                    </button>
                  </div>
                ) : lookedUpCoupon.status === 'USED' ? (
                  <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/40 text-purple-200 text-xs flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0" />
                    <div>
                      <strong>Pass Already Redeemed!</strong>
                      <p className="mt-0.5 text-purple-300/80">
                        This pass was redeemed on {lookedUpCoupon.redeemedAt ? new Date(lookedUpCoupon.redeemedAt).toLocaleString() : 'record'}{' '}
                        {lookedUpCoupon.redeemedBy ? `by ${lookedUpCoupon.redeemedBy}` : ''}. Duplicate meals cannot be issued.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                    <span>This pass cannot be redeemed because its status is: {lookedUpCoupon.status}.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB: NOTIFICATIONS (admin -> coordinators only) */}
        {activeTab === 'messages' && (
          <CoordinatorMessagesSection
            currentUser={user}
            notifications={coordNotifications}
            reports={coordReports}
            onRefresh={refreshMessages}
            showToast={showToast}
          />
        )}

        {/* TAB 7: PROFILE */}

        {activeTab === 'profile' && (
          <div className="max-w-3xl space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                Co-ordinator Profile & Security
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Manage your coordinator identity, departmental accreditation, and account password.
              </p>
            </div>

            {profileSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-mono flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="p-6 sm:p-8 rounded-3xl bg-slate-950/80 border border-purple-900/40 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Coordinator Name
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/50 border border-purple-900/30 text-slate-400 text-sm cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={user.department.toUpperCase()}
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/50 border border-purple-900/30 text-pink-400 font-bold text-sm cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Faculty / Staff ID
                  </label>
                  <input
                    type="text"
                    value={profileFacultyId}
                    onChange={(e) => setProfileFacultyId(e.target.value)}
                    placeholder="COORD-CSE-01"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="pt-5 border-t border-purple-900/50 space-y-4">
                <div className="flex items-center gap-2 text-purple-300 text-sm font-bold font-heading">
                  <KeyRound className="w-4 h-4 text-purple-400" />
                  <span>Update Account Password</span>
                </div>
                <p className="text-xs text-slate-400">
                  Enter a new password below to update your login credentials. Leave blank to keep your current password.
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
                        className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-purple-500"
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
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500">
                  Role: <strong className="text-purple-400 uppercase">Coordinator</strong> ({user.college})
                </span>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-tech font-bold uppercase tracking-wider shadow-lg shadow-purple-600/30 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {isSavingProfile ? 'Updating Credentials...' : 'Save Profile & Password'}
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
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-purple-800/40 text-[11px] font-mono text-purple-300 font-bold">
                  Host Institution
                </div>
              </div>
              <div className="p-5 sm:p-6">
                <h4 className="text-lg font-bold font-heading text-white mb-1">
                  Lakireddy Bali Reddy College of Engineering (Autonomous)
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Mylavaram, Krishna District, Andhra Pradesh. Approved by AICTE, Accredited by NAAC with &apos;A&apos; Grade.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Participant Detail Modal */}
        {viewParticipant && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            onClick={(e) => {
              if (e.target === e.currentTarget) setViewParticipant(null);
            }}
          >
            <div className="relative w-full max-w-lg rounded-3xl bg-slate-950 border border-purple-800/60 p-6 sm:p-8 space-y-5">
              <button
                onClick={() => setViewParticipant(null)}
                className="absolute right-4 top-4 p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <span className="text-xs font-mono uppercase text-purple-400 font-bold">
                  Registration Credential
                </span>
                <h3 className="text-2xl font-bold font-heading text-white mt-1">
                  {viewParticipant.studentName}
                </h3>
              </div>

              <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-900/30 text-xs font-mono space-y-2">
                <div>Registration Token: <span className="text-cyan-400 font-bold">{viewParticipant.id}</span></div>
                <div>Email: <span className="text-white">{viewParticipant.studentEmail}</span></div>
                <div>Phone: <span className="text-white">{viewParticipant.studentPhone || 'N/A'}</span></div>
                <div>Roll No: <span className="text-cyan-300 font-bold">{(viewParticipant as any).studentRollNo || 'N/A'}</span></div>
                <div>College: <span className="text-white">{viewParticipant.college}</span></div>
                <div>Department: <span className="text-purple-300 uppercase">{viewParticipant.department}</span></div>
                <div>Event Enrolled: <span className="text-pink-400 font-bold">{viewParticipant.eventName}</span></div>
                {viewParticipant.teamMembers && (
                  <div>Team Members + Roll Nos: <span className="text-slate-300">{viewParticipant.teamMembers}</span></div>
                )}
                <div>Status: <span className="text-emerald-400 font-bold uppercase">{viewParticipant.status}</span></div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setViewParticipant(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-tech font-bold uppercase"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* IN-APP CONFIRM DELETE MODAL */}
        <ConfirmDeleteModal
          isOpen={deleteModalConfig.isOpen}
          title={deleteModalConfig.title}
          message={deleteModalConfig.message}
          itemName={deleteModalConfig.name}
          confirmText="Yes, Proceed"
          cancelText="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteModalConfig(prev => ({ ...prev, isOpen: false }))}
        />
      </main>
    </div>
  );
};
