import React, { useState, useEffect, useMemo } from 'react';
import { User, ManagedEvent, Registration, DepartmentId, EventCategory, UserRole, FoodCoupon } from '../../types';
import { dbService } from '../../services/dbService';
import { DEPARTMENTS } from '../../data/lakshyaData';
import { SoundEngine } from '../AudioEngine';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  ClipboardList, 
  Calendar, 
  Layers, 
  Ticket, 
  Building2, 
  FileText, 
  BarChart3, 
  User as UserIcon, 
  Settings, 
  LogOut, 
  Search, 
  Filter, 
  PlusCircle, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Sparkles, 
  ArrowLeft,
  Download,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  KeyRound,
  X,
  Utensils,
  MailCheck,
  QrCode,
  RefreshCw,
  Megaphone
} from 'lucide-react';

import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { AdminAnnouncementsSection } from './AdminAnnouncementsSection';

interface AdminDashboardProps {
  user: Omit<User, 'passwordHash'>;
  onLogout: () => void;
  onBackToWebsite: () => void;
  onUserUpdate: (updatedUser: Omit<User, 'passwordHash'>) => void;
  onSwitchRole?: (role: UserRole) => void;
  availableRoles?: UserRole[];
}

type AdminTab = 
  | 'dashboard'
  | 'users'
  | 'students'
  | 'coordinators'
  | 'events'
  | 'departments'
  | 'registrations'
  | 'food-tokens'
  | 'colleges'
  | 'reports'
  | 'analytics'
  | 'profile'
  | 'settings';


// Future default registration deadline (+30 days) so events are never created as closed.
const defaultRegistrationDeadline = (): string => {
  const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} 11:59 PM`;
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  onLogout,
  onBackToWebsite,
  onUserUpdate,
  onSwitchRole,
  availableRoles = []
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [analytics, setAnalytics] = useState<any>(() => ({
    users: { total: 0, students: 0, coordinators: 0, admins: 0, lbrceRegisteredStudents: 0, otherCollegeStudents: 0, participatingColleges: 0 },
    events: { total: 0, upcoming: 0, ongoing: 0, completed: 0, cancelled: 0, deptWise: {} },
    registrations: {
      total: 0,
      active: 0,
      participatingStudents: 0,
      lbrceRegistrations: 0,
      otherCollegeRegistrations: 0,
      multiEventStudentsCount: 0,
      collegeStats: [],
      deptStats: [],
      popularEvents: [],
    },
    totalRevenue: '₹0',
    checkedInRegistrations: 0,
  }));
  const [usersList, setUsersList] = useState<Omit<User, 'passwordHash'>[]>([]);
  const [eventsList, setEventsList] = useState<ManagedEvent[]>([]);
  const [registrationsList, setRegistrationsList] = useState<Registration[]>([]);

  // Search & Filters
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'student' | 'coordinator' | 'admin'>('all');
  
  const [eventSearch, setEventSearch] = useState('');
  const [eventDeptFilter, setEventDeptFilter] = useState<DepartmentId>('all');
  const [eventStatusFilter, setEventStatusFilter] = useState<string>('all');

  const [regSearch, setRegSearch] = useState('');
  const [regCollegeFilter, setRegCollegeFilter] = useState<'all' | 'lbrce' | 'other'>('all');

  // Modals state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Omit<User, 'passwordHash'> | null>(null);
  const [userFormName, setUserFormName] = useState('');
  const [userFormEmail, setUserFormEmail] = useState('');
  const [userFormRoles, setUserFormRoles] = useState<UserRole[]>(['student']);
  const [userFormCollege, setUserFormCollege] = useState('Lakireddy Bali Reddy College of Engineering (Autonomous)');
  const [userFormDepartment, setUserFormDepartment] = useState('cse');
  const [userFormPhone, setUserFormPhone] = useState('');
  const [userFormRollNo, setUserFormRollNo] = useState('');
  const [userFormFacultyId, setUserFormFacultyId] = useState('');
  const [userFormDesignation, setUserFormDesignation] = useState('');
  const [userFormPassword, setUserFormPassword] = useState('');
  const [userFormError, setUserFormError] = useState<string | null>(null);

  // User History modal
  const [selectedUserHistory, setSelectedUserHistory] = useState<Omit<User, 'passwordHash'> | null>(null);

  // Event modal (Add/Edit)
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ManagedEvent | null>(null);
  const [evName, setEvName] = useState('');
  const [evDescription, setEvDescription] = useState('');
  const [evDept, setEvDept] = useState<DepartmentId>('cse');
  const [evCategory, setEvCategory] = useState<EventCategory>('technical');
  const [evCoord, setEvCoord] = useState('');
  const [evDate, setEvDate] = useState('2026-03-20');
  const [evTime, setEvTime] = useState('10:00 AM - 01:00 PM');
  const [evVenue, setEvVenue] = useState('');
  const [evDeadline, setEvDeadline] = useState(defaultRegistrationDeadline);
  const [evMaxParticipants, setEvMaxParticipants] = useState(100);
  const [evEntryFee, setEvEntryFee] = useState('₹150');
  const [evTeamSize, setEvTeamSize] = useState('Team of 2');
  const [evPrizeFirst, setEvPrizeFirst] = useState('₹10,000');
  const [evPrizeSecond, setEvPrizeSecond] = useState('₹5,000');
  const [evStatus, setEvStatus] = useState<'upcoming' | 'ongoing' | 'completed' | 'cancelled'>('upcoming');
  const [evApproval, setEvApproval] = useState<'approved' | 'pending' | 'rejected'>('approved');

  // Admin Self Profile & Password State
  const [adminName, setAdminName] = useState(user.name);
  const [adminPhone, setAdminPhone] = useState(user.phone || '');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminProfileSuccess, setAdminProfileSuccess] = useState<string | null>(null);
  const [adminProfileError, setAdminProfileError] = useState<string | null>(null);
  const [isAdminSaving, setIsAdminSaving] = useState(false);

  // Food Tokens state (Exclusive for Event Registered Participants)
  const [adminFoodCoupons, setAdminFoodCoupons] = useState<FoodCoupon[]>([]);
  const [isBulkGeneratingTokens, setIsBulkGeneratingTokens] = useState(false);
  const [bulkGenerateResult, setBulkGenerateResult] = useState<{
    success: boolean;
    message: string;
    stats?: {
      totalEventRegistrations: number;
      uniqueParticipants: number;
      newTokensGenerated: number;
      alreadyHadTokens: number;
      emailsDispatched: number;
    };
  } | null>(null);
  const [tokenSearch, setTokenSearch] = useState('');
  const [tokenStatusFilter, setTokenStatusFilter] = useState<'all' | 'ACTIVE' | 'USED' | 'EXPIRED'>('all');

  // Send Coupons To Any Email (Admin only, irrespective of event participation)
  const [manualCouponEmail, setManualCouponEmail] = useState('');
  const [manualCouponName, setManualCouponName] = useState('');
  const [isSendingManualCoupon, setIsSendingManualCoupon] = useState(false);
  const [manualCouponResult, setManualCouponResult] = useState<{
    success: boolean;
    message: string;
    coupon?: FoodCoupon;
  } | null>(null);

  // Load all system data
  const loadSystemData = async () => {
    try {
      const stats = await dbService.getSystemAnalytics();
      setAnalytics(stats);
      const users = await dbService.getUsers();
      setUsersList(users || []);
      const evts = await dbService.syncEvents();
      setEventsList(evts || []);
      const regs = await dbService.getAllRegistrationsAdmin();
      setRegistrationsList(regs || []);

      // Load Food Tokens
      const cpnData = await dbService.getAllFoodCoupons();
      setAdminFoodCoupons(cpnData.coupons || []);
    } catch {
      // fallback
    }
  };


  useEffect(() => {
    loadSystemData();
  }, []);

  // Auto-refresh registrations/coupons whenever the admin navigates to those tabs
  useEffect(() => {
    if (activeTab === 'registrations' || activeTab === 'food-tokens') {
      loadSystemData();
    }
  }, [activeTab]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return (usersList || []).filter((u) => {
      if (!u) return false;
      const q = (userSearch || '').toLowerCase();
      const matchSearch = (u.name || '').toLowerCase().includes(q) ||
                          (u.email || '').toLowerCase().includes(q) ||
                          (u.college || '').toLowerCase().includes(q) ||
                          ((u.rollNo || '').toLowerCase().includes(q));
      const matchRole = userRoleFilter === 'all' || 
                        (Array.isArray(u.roles) ? u.roles.includes(userRoleFilter as UserRole) : u.role === userRoleFilter);
      return matchSearch && matchRole;
    });
  }, [usersList, userSearch, userRoleFilter]);

  // Students (all users possessing student / participant access)
  const studentsList = useMemo(() => {
    return (usersList || []).filter(u => {
      if (!u) return false;
      return (Array.isArray(u.roles) && u.roles.includes('student')) || u.role === 'student';
    });
  }, [usersList]);

  // Coordinators (all users possessing coordinator access)
  const coordinatorsList = useMemo(() => {
    return (usersList || []).filter(u => {
      if (!u) return false;
      return (Array.isArray(u.roles) && u.roles.includes('coordinator')) || u.role === 'coordinator';
    });
  }, [usersList]);

  // Admins (all users possessing admin access)
  const adminsList = useMemo(() => {
    return (usersList || []).filter(u => {
      if (!u) return false;
      return (Array.isArray(u.roles) && u.roles.includes('admin')) || u.role === 'admin';
    });
  }, [usersList]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return (eventsList || []).filter((e) => {
      if (!e) return false;
      const q = (eventSearch || '').toLowerCase();
      const matchSearch = (e.eventName || '').toLowerCase().includes(q) ||
                          (e.description || '').toLowerCase().includes(q) ||
                          (e.venue || '').toLowerCase().includes(q);
      const matchDept = eventDeptFilter === 'all' || e.department === eventDeptFilter;
      const matchStatus = eventStatusFilter === 'all' || e.status === eventStatusFilter;
      return matchSearch && matchDept && matchStatus;
    });
  }, [eventsList, eventSearch, eventDeptFilter, eventStatusFilter]);

  // Filtered Registrations
  const filteredRegistrations = useMemo(() => {
    return (registrationsList || []).filter((r) => {
      if (!r) return false;
      const q = (regSearch || '').toLowerCase();
      const matchSearch = (r.studentName || '').toLowerCase().includes(q) ||
                          (r.studentEmail || '').toLowerCase().includes(q) ||
                          (r.eventName || '').toLowerCase().includes(q) ||
                          (r.college || '').toLowerCase().includes(q) ||
                          ((r.id || '').toLowerCase().includes(q));
      const isLBRCE = (r.college || '').includes('Lakireddy Bali Reddy');
      const matchCollege = regCollegeFilter === 'all' ||
                           (regCollegeFilter === 'lbrce' && isLBRCE) ||
                           (regCollegeFilter === 'other' && !isLBRCE);
      return matchSearch && matchCollege;
    });
  }, [registrationsList, regSearch, regCollegeFilter]);

  // 1-Click Access Role Toggle
  const handleToggleUserAccess = async (targetUser: Omit<User, 'passwordHash'>, roleToToggle: UserRole) => {
    SoundEngine.playClick();
    const currentRoles: UserRole[] = Array.isArray(targetUser.roles) && targetUser.roles.length > 0
      ? targetUser.roles
      : [targetUser.role || 'student'];

    let newRoles: UserRole[];
    if (currentRoles.includes(roleToToggle)) {
      if (currentRoles.length === 1) {
        showToast('Each user must retain at least one access privilege.', 'error');
        return;
      }
      newRoles = currentRoles.filter(r => r !== roleToToggle);
    } else {
      newRoles = [...currentRoles, roleToToggle];
    }

    try {
      await dbService.updateUser(targetUser.id, {
        roles: newRoles,
        role: newRoles[0] || 'student'
      });
      showToast(`Updated ${roleToToggle} access for ${targetUser.name}.`, 'success');
      loadSystemData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update access role.', 'error');
    }
  };

  // User Modal Actions
  const handleOpenUserModal = (targetUser?: Omit<User, 'passwordHash'>) => {
    SoundEngine.playClick();
    setUserFormError(null);
    if (targetUser) {
      setEditingUser(targetUser);
      setUserFormName(targetUser.name);
      setUserFormEmail(targetUser.email);
      const roles = Array.isArray(targetUser.roles) && targetUser.roles.length > 0
        ? targetUser.roles
        : [targetUser.role || 'student'];
      setUserFormRoles(roles);
      setUserFormCollege(targetUser.college);
      setUserFormDepartment(targetUser.department);
      setUserFormPhone(targetUser.phone || '');
      setUserFormRollNo(targetUser.rollNo || '');
      setUserFormFacultyId(targetUser.facultyId || targetUser.rollNo || '');
      setUserFormDesignation(targetUser.designation || (roles.includes('coordinator') ? 'Faculty Coordinator' : ''));
      setUserFormPassword('');
    } else {
      setEditingUser(null);
      setUserFormName('');
      setUserFormEmail('');
      setUserFormRoles(['student']);
      setUserFormCollege('Lakireddy Bali Reddy College of Engineering (Autonomous)');
      setUserFormDepartment('cse');
      setUserFormPhone('');
      setUserFormRollNo('');
      setUserFormFacultyId('');
      setUserFormDesignation('');
      setUserFormPassword('welcome123');
    }
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError(null);
    const assignedRoles: UserRole[] = userFormRoles.length > 0 ? userFormRoles : ['student'];
    try {
      if (editingUser) {
        await dbService.updateUser(editingUser.id, {
          name: userFormName.trim(),
          email: userFormEmail.trim().toLowerCase(),
          role: assignedRoles[0],
          roles: assignedRoles,
          college: userFormCollege,
          department: userFormDepartment,
          phone: userFormPhone.trim(),
          rollNo: userFormRollNo.trim(),
          facultyId: userFormFacultyId.trim(),
          designation: userFormDesignation.trim(),
          newPassword: userFormPassword ? userFormPassword.trim() : undefined
        });
        showToast(`User access privileges updated for ${userFormEmail}!`, 'success');
      } else {
        await dbService.addUserAdmin({
          name: userFormName.trim(),
          email: userFormEmail.trim().toLowerCase(),
          passwordHash: '',
          password: userFormPassword ? userFormPassword.trim() : 'welcome123',
          role: assignedRoles[0],
          roles: assignedRoles,
          college: userFormCollege,
          department: userFormDepartment,
          phone: userFormPhone.trim(),
          rollNo: userFormRollNo.trim(),
          facultyId: userFormFacultyId.trim(),
          designation: userFormDesignation.trim(),
          status: 'active'
        });
        showToast(`Access granted successfully for ${userFormEmail}!`, 'success');
      }
      SoundEngine.playSuccess();
      setUserModalOpen(false);
      loadSystemData();
    } catch (err: any) {
      setUserFormError(err.message || 'Failed to save user access.');
    }
  };

  const handleSaveAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminProfileSuccess(null);
    setAdminProfileError(null);

    if (adminPassword && adminPassword.length < 4) {
      setAdminProfileError('New password must be at least 4 characters long.');
      return;
    }
    if (adminPassword && adminPassword !== adminConfirmPassword) {
      setAdminProfileError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsAdminSaving(true);
    try {
      const updated = await dbService.updateUser(user.id, {
        name: adminName.trim() || user.name,
        phone: adminPhone.trim() || undefined,
        newPassword: adminPassword.trim() || undefined
      });
      SoundEngine.playSuccess();
      setAdminProfileSuccess(adminPassword ? 'Administrator password and profile updated successfully!' : 'Administrator profile updated successfully!');
      onUserUpdate(updated);
      setAdminPassword('');
      setAdminConfirmPassword('');
      setTimeout(() => setAdminProfileSuccess(null), 4000);
    } catch (err: any) {
      setAdminProfileError(err.message || 'Failed to update admin profile.');
    } finally {
      setIsAdminSaving(false);
    }
  };

  // Delete Confirmation Modal State
  const [deleteModalConfig, setDeleteModalConfig] = useState<{
    isOpen: boolean;
    type: 'user' | 'event' | 'registration';
    id: string;
    name: string;
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'user',
    id: '',
    name: '',
    title: '',
    message: '',
  });

  // Admin In-App Toast
  const [adminToast, setAdminToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setAdminToast({ message, type });
    setTimeout(() => setAdminToast(null), 4000);
  };

  const handleToggleUserStatus = async (targetUser: Omit<User, 'passwordHash'>) => {
    const nextStatus = targetUser.status === 'active' ? 'disabled' : 'active';
    try {
      await dbService.updateUser(targetUser.id, { status: nextStatus });
      SoundEngine.playClick();
      showToast(`User status updated to "${nextStatus}".`, 'success');
      loadSystemData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update user status.', 'error');
    }
  };

  const requestDeleteUser = (id: string, name: string) => {
    SoundEngine.playClick();
    setDeleteModalConfig({
      isOpen: true,
      type: 'user',
      id,
      name,
      title: 'Delete User Account',
      message: `Are you sure you want to permanently delete user account "${name}"? This removes their registration access and festival profile.`
    });
  };

  const requestDeleteEvent = (id: string, name: string) => {
    SoundEngine.playClick();
    setDeleteModalConfig({
      isOpen: true,
      type: 'event',
      id,
      name,
      title: 'Delete Festival Event',
      message: `Are you sure you want to permanently delete event "${name}"? It will be removed from all student registration views and departmental schedules.`
    });
  };

  const requestDeleteRegistration = (id: string, studentName: string, eventName: string) => {
    SoundEngine.playClick();
    setDeleteModalConfig({
      isOpen: true,
      type: 'registration',
      id,
      name: `${studentName} (${eventName})`,
      title: 'Delete Registration Record',
      message: `Are you sure you want to permanently delete registration token "${id}" for student "${studentName}"?`
    });
  };

  const handleConfirmDelete = async () => {
    setDeleteModalConfig(prev => ({ ...prev, isOpen: false }));
    try {
      if (deleteModalConfig.type === 'user') {
        await dbService.deleteUser(deleteModalConfig.id);
        SoundEngine.playSuccess();
        showToast(`User "${deleteModalConfig.name}" was successfully deleted.`, 'success');
      } else if (deleteModalConfig.type === 'event') {
        await dbService.deleteEvent(deleteModalConfig.id);
        SoundEngine.playSuccess();
        showToast(`Event "${deleteModalConfig.name}" was successfully deleted.`, 'success');
      } else if (deleteModalConfig.type === 'registration') {
        await dbService.deleteRegistration(deleteModalConfig.id);
        SoundEngine.playSuccess();
        showToast(`Registration "${deleteModalConfig.id}" was successfully deleted.`, 'success');
      }
      await loadSystemData();
    } catch (err: any) {
      showToast(err.message || 'Action failed.', 'error');
    }
  };

  // Event Actions
  const handleOpenEventModal = (targetEvent?: ManagedEvent) => {
    SoundEngine.playClick();
    if (targetEvent) {
      setEditingEvent(targetEvent);
      setEvName(targetEvent.eventName);
      setEvDescription(targetEvent.description);
      setEvDept(targetEvent.department);
      setEvCategory(targetEvent.category);
      setEvCoord(targetEvent.coordinator);
      setEvDate(targetEvent.date);
      setEvTime(targetEvent.time);
      setEvVenue(targetEvent.venue);
      setEvDeadline(targetEvent.registrationDeadline);
      setEvMaxParticipants(targetEvent.maxParticipants);
      setEvEntryFee(targetEvent.entryFee);
      setEvTeamSize(targetEvent.teamSize);
      setEvPrizeFirst(targetEvent.prizes.first);
      setEvPrizeSecond(targetEvent.prizes.second);
      setEvStatus(targetEvent.status);
      setEvApproval(targetEvent.approvalStatus);
    } else {
      setEditingEvent(null);
      setEvName('');
      setEvDescription('');
      setEvDept('cse');
      setEvCategory('technical');
      setEvCoord(coordinatorsList[0]?.id || user.id);
      setEvDate('2026-03-20');
      setEvTime('10:00 AM - 01:00 PM');
      setEvVenue('Auditorium / Lab');
      setEvDeadline(defaultRegistrationDeadline());
      setEvMaxParticipants(100);
      setEvEntryFee('₹150');
      setEvTeamSize('Team of 2');
      setEvPrizeFirst('₹10,000');
      setEvPrizeSecond('₹5,000');
      setEvStatus('upcoming');
      setEvApproval('approved');
    }
    setEventModalOpen(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const assignedCoord = coordinatorsList.find(c => c.id === evCoord);
    try {
      if (editingEvent) {
        dbService.updateEvent(editingEvent.id, {
          eventName: evName,
          description: evDescription,
          department: evDept,
          category: evCategory,
          coordinator: evCoord,
          coordinatorName: assignedCoord ? assignedCoord.name : user.name,
          coordinatorEmail: assignedCoord ? assignedCoord.email : user.email,
          date: evDate,
          time: evTime,
          venue: evVenue,
          registrationDeadline: evDeadline,
          maxParticipants: Number(evMaxParticipants) || 100,
          entryFee: evEntryFee,
          teamSize: evTeamSize,
          prizes: { first: evPrizeFirst, second: evPrizeSecond },
          status: evStatus,
          approvalStatus: evApproval
        });
      } else {
        dbService.createEvent({
          eventName: evName,
          description: evDescription,
          department: evDept,
          category: evCategory,
          coordinator: evCoord,
          coordinatorName: assignedCoord ? assignedCoord.name : user.name,
          coordinatorEmail: assignedCoord ? assignedCoord.email : user.email,
          date: evDate,
          time: evTime,
          venue: evVenue,
          registrationDeadline: evDeadline,
          maxParticipants: Number(evMaxParticipants) || 100,
          entryFee: evEntryFee,
          teamSize: evTeamSize,
          prizes: { first: evPrizeFirst, second: evPrizeSecond },
          status: evStatus,
          approvalStatus: evApproval
        });
      }
      SoundEngine.playSuccess();
      setEventModalOpen(false);
      showToast(editingEvent ? `Event "${evName}" updated successfully.` : `Event "${evName}" created successfully.`, 'success');
      loadSystemData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save event.', 'error');
    }
  };

  const handleDeleteEvent = (id: string, name: string) => {
    requestDeleteEvent(id, name);
  };

  const handleToggleEventApproval = (ev: ManagedEvent) => {
    const nextApproval = ev.approvalStatus === 'approved' ? 'pending' : 'approved';
    try {
      dbService.updateEvent(ev.id, { approvalStatus: nextApproval });
      SoundEngine.playClick();
      showToast(`Event status updated to "${nextApproval}".`, 'success');
      loadSystemData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update event approval.', 'error');
    }
  };

  // CSV Export
  const handleExportRegistrationsCSV = () => {
    SoundEngine.playClick();
    const headers = ['Registration ID', 'Student Name', 'Email', 'Phone', 'College', 'Department', 'Event', 'Date', 'Status'];
    const rows = filteredRegistrations.map(r => [
      r.id,
      `"${r.studentName}"`,
      r.studentEmail,
      r.studentPhone || '',
      `"${r.college}"`,
      r.department,
      `"${r.eventName}"`,
      r.registrationDate,
      r.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `lakshya_registrations_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Chart palette
  const COLORS = ['#ec4899', '#06b6d4', '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="min-h-screen bg-[#070415] text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-950/95 border-b md:border-b-0 md:border-r border-purple-900/40 p-4 flex flex-col shrink-0">
        {/* Brand */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-purple-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-heading font-extrabold text-white text-base tracking-wider block">
                LAKSHYA 2026
              </span>
              <span className="text-[10px] font-mono text-cyan-400 uppercase font-semibold">
                Super Admin Portal
              </span>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-bold text-sm">
              👑
            </div>
            <div className="overflow-hidden">
              <span className="text-sm font-bold text-white block truncate">{user.name}</span>
              <span className="text-[10px] font-mono text-cyan-300/80 block truncate">
                Chief Administrator
              </span>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1 flex-1 overflow-y-auto pr-1">
          <button
            onClick={() => { SoundEngine.playClick(); setActiveTab('dashboard'); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => { SoundEngine.playClick(); setActiveTab('users'); }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4" />
              <span>Users</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold">
              {usersList.length}
            </span>
          </button>

          <button
            onClick={() => { SoundEngine.playClick(); setActiveTab('students'); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'students'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Students</span>
          </button>

          <button
            onClick={() => { SoundEngine.playClick(); setActiveTab('coordinators'); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'coordinators'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Co-ordinators</span>
          </button>

          <button
            onClick={() => { SoundEngine.playClick(); setActiveTab('announcements'); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'announcements'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>Announcements</span>
          </button>

          <button
            onClick={() => { SoundEngine.playClick(); setActiveTab('events'); }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'events'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4" />
              <span>Events</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold">
              {eventsList.length}
            </span>
          </button>

          <button
            onClick={() => { SoundEngine.playClick(); setActiveTab('departments'); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'departments'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Departments</span>
          </button>

          <button
            onClick={() => { SoundEngine.playClick(); setActiveTab('registrations'); }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'registrations'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Ticket className="w-4 h-4" />
              <span>Registrations</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-mono text-[10px] font-bold">
              {registrationsList.length}
            </span>
          </button>

          <button
            onClick={() => { SoundEngine.playClick(); setActiveTab('food-tokens'); }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'food-tokens'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Utensils className="w-4 h-4 text-emerald-400" />
              <span>Participant Food Tokens</span>
            </div>
            {adminFoodCoupons.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                {adminFoodCoupons.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { SoundEngine.playClick(); setActiveTab('colleges'); }}

            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'colleges'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Participating Colleges</span>
          </button>

          <button
            onClick={() => { SoundEngine.playClick(); setActiveTab('reports'); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Reports</span>
          </button>

          <button
            onClick={() => { SoundEngine.playClick(); setActiveTab('analytics'); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </button>

          <button
            onClick={() => { SoundEngine.playClick(); setActiveTab('profile'); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Profile</span>
          </button>

          <button
            onClick={() => { SoundEngine.playClick(); setActiveTab('settings'); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </nav>

        {/* Host Campus Badge */}
        <div className="pt-2.5 my-1.5 border-t border-purple-950">
          <div className="relative rounded-xl overflow-hidden border border-cyan-900/40 group">
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
              <span className="text-cyan-400 font-bold block truncate">LBRCE Mylavaram</span>
              <span className="text-slate-400 block truncate">Host Campus Arena</span>
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="pt-3 mt-3 border-t border-purple-950 space-y-1.5">
          <button
            onClick={() => { SoundEngine.playClick(); onBackToWebsite(); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono text-cyan-300 hover:text-white hover:bg-cyan-950/40 transition-colors cursor-pointer"
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
        {/* In-App Toast Banner */}
        {adminToast && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-mono font-bold shadow-xl border animate-in fade-in slide-in-from-top-2 duration-200 ${
            adminToast.type === 'success' 
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' 
              : 'bg-red-950/80 border-red-500/50 text-red-300'
          }`}>
            <div className="flex items-center gap-2.5">
              {adminToast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
              <span>{adminToast.message}</span>
            </div>
            <button onClick={() => setAdminToast(null)} className="p-1 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Multi-Role Quick Switcher Banner */}
        {availableRoles && availableRoles.length > 1 && onSwitchRole && (
          <div className="mb-6 p-3 rounded-2xl bg-gradient-to-r from-cyan-950/60 to-slate-900 border border-cyan-800/40 flex flex-wrap items-center justify-between gap-3 text-xs backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-mono text-cyan-200">
                Active Console: <strong className="text-white">Chief Administrator</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400">Switch View:</span>
              {availableRoles.map((r) => (
                <button
                  key={r}
                  onClick={() => onSwitchRole(r)}
                  className={`px-3 py-1 rounded-xl text-xs font-tech font-bold uppercase transition-all cursor-pointer ${
                    r === 'admin'
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                      : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-purple-900/50'
                  }`}
                >
                  {r === 'admin' ? '👑 Admin' : r === 'coordinator' ? '📋 Coordinator' : '🎓 Student'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB 1: DASHBOARD OVERVIEW & ANALYTICS */}
        {activeTab === 'dashboard' && analytics && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono uppercase text-cyan-400 tracking-wider font-semibold block mb-1">
                  Lakireddy Bali Reddy College of Engineering • Autonomous
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                  Central Event Management Console
                </h1>
                <p className="text-xs sm:text-sm text-slate-300">
                  Real-time analytics computed directly from the live database.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleOpenUserModal()}
                  className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-tech font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-600/30"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add User</span>
                </button>
                <button
                  onClick={() => handleOpenEventModal()}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-tech font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-600/30"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Event</span>
                </button>
                <button
                  onClick={handleExportRegistrationsCSV}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-purple-800/40 text-purple-200 text-xs font-tech font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* USERS STATS CARDS */}
            <div>
              <h3 className="text-xs font-mono uppercase text-slate-400 font-bold tracking-wider mb-3">
                Users & Institutional Breakdown
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                  <span className="text-[10px] font-mono text-purple-300 uppercase block">Total Users</span>
                  <span className="text-2xl font-tech font-extrabold text-white mt-1 block">
                    {usersList.length}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                  <span className="text-[10px] font-mono text-pink-300 uppercase block">Total Students</span>
                  <span className="text-2xl font-tech font-extrabold text-pink-400 mt-1 block">
                    {studentsList.length}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                  <span className="text-[10px] font-mono text-purple-300 uppercase block">Co-ordinators</span>
                  <span className="text-2xl font-tech font-extrabold text-purple-300 mt-1 block">
                    {coordinatorsList.length}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                  <span className="text-[10px] font-mono text-cyan-300 uppercase block">Admins</span>
                  <span className="text-2xl font-tech font-extrabold text-cyan-400 mt-1 block">
                    {adminsList.length}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                  <span className="text-[10px] font-mono text-emerald-300 uppercase block">LBRCE Students</span>
                  <span className="text-2xl font-tech font-extrabold text-emerald-400 mt-1 block">
                    {studentsList.filter(s => (s.college || '').toLowerCase().includes('lakireddy') || (s.college || '').toLowerCase().includes('lbrce')).length}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                  <span className="text-[10px] font-mono text-amber-300 uppercase block">Other Colleges</span>
                  <span className="text-2xl font-tech font-extrabold text-amber-400 mt-1 block">
                    {studentsList.filter(s => !(s.college || '').toLowerCase().includes('lakireddy') && !(s.college || '').toLowerCase().includes('lbrce')).length}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                  <span className="text-[10px] font-mono text-indigo-300 uppercase block">Institutions</span>
                  <span className="text-2xl font-tech font-extrabold text-indigo-400 mt-1 block">
                    {new Set(usersList.map(u => u.college).filter(Boolean)).size}
                  </span>
                </div>
              </div>
            </div>

            {/* EVENTS STATS CARDS */}
            <div>
              <h3 className="text-xs font-mono uppercase text-slate-400 font-bold tracking-wider mb-3">
                Events Status Overview
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Total Events</span>
                  <span className="text-2xl font-tech font-extrabold text-white mt-1 block">
                    {analytics.events.total}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase block">Upcoming</span>
                  <span className="text-2xl font-tech font-extrabold text-cyan-400 mt-1 block">
                    {analytics.events.upcoming}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                  <span className="text-[10px] font-mono text-amber-400 uppercase block">Ongoing</span>
                  <span className="text-2xl font-tech font-extrabold text-amber-400 mt-1 block">
                    {analytics.events.ongoing}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                  <span className="text-[10px] font-mono text-emerald-400 uppercase block">Completed</span>
                  <span className="text-2xl font-tech font-extrabold text-emerald-400 mt-1 block">
                    {analytics.events.completed}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                  <span className="text-[10px] font-mono text-red-400 uppercase block">Cancelled</span>
                  <span className="text-2xl font-tech font-extrabold text-red-400 mt-1 block">
                    {analytics.events.cancelled}
                  </span>
                </div>
              </div>
            </div>

            {/* REGISTRATIONS STATS CARDS */}
            <div>
              <h3 className="text-xs font-mono uppercase text-slate-400 font-bold tracking-wider mb-3">
                Event Registrations & Participation
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                  <span className="text-[10px] font-mono text-pink-400 uppercase block">Total Registrations</span>
                  <span className="text-2xl font-tech font-extrabold text-pink-400 mt-1 block">
                    {analytics.registrations.total}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase block">Participating Students</span>
                  <span className="text-2xl font-tech font-extrabold text-cyan-400 mt-1 block">
                    {analytics.registrations.participatingStudents}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                  <span className="text-[10px] font-mono text-purple-300 uppercase block">LBRCE Enrolled</span>
                  <span className="text-2xl font-tech font-extrabold text-white mt-1 block">
                    {analytics.registrations.lbrceRegistrations}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                  <span className="text-[10px] font-mono text-emerald-400 uppercase block">Other Colleges</span>
                  <span className="text-2xl font-tech font-extrabold text-emerald-400 mt-1 block">
                    {analytics.registrations.otherCollegeRegistrations}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                  <span className="text-[10px] font-mono text-amber-400 uppercase block">Multi-Event Students</span>
                  <span className="text-2xl font-tech font-extrabold text-amber-400 mt-1 block">
                    {analytics.registrations.multiEventStudentsCount}
                  </span>
                </div>
              </div>
            </div>

            {/* VISUAL RECHARTS ANALYTICS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Department-Wise Registrations */}
              <div className="p-6 rounded-3xl bg-slate-950/80 border border-purple-900/40">
                <h3 className="font-heading font-bold text-base text-white mb-2">
                  Department-Wise Registration Volume
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Total student enrollments across each of the 9 engineering branches.
                </p>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Array.isArray(analytics?.registrations?.deptStats) ? analytics.registrations.deptStats : []}>
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f0826', borderColor: '#6b21a8', borderRadius: '12px' }}
                      />
                      <Bar dataKey="registrations" fill="#ec4899" radius={[6, 6, 0, 0]} name="Registrations" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* College-Wise Registrations */}
              <div className="p-6 rounded-3xl bg-slate-950/80 border border-purple-900/40">
                <h3 className="font-heading font-bold text-base text-white mb-2">
                  Top Participating Colleges
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Registrations originating from LBRCE and external universities.
                </p>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={(Array.isArray(analytics?.registrations?.collegeStats) ? analytics.registrations.collegeStats : []).slice(0, 6)}
                    >
                      <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis dataKey="college" type="category" stroke="#94a3b8" fontSize={10} width={100} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f0826', borderColor: '#6b21a8', borderRadius: '12px' }}
                      />
                      <Bar dataKey="count" fill="#06b6d4" radius={[0, 6, 6, 0]} name="Registrations" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Popular Events Ranking */}
            <div className="p-6 rounded-3xl bg-slate-950/80 border border-purple-900/40">
              <h3 className="font-heading font-bold text-base text-white mb-3">
                Most Popular & Registered Events
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(Array.isArray(analytics?.registrations?.popularEvents) ? analytics.registrations.popularEvents : []).slice(0, 6).map((ev: any, index: number) => (
                  <div
                    key={ev.id}
                    className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-900/30 flex items-center justify-between"
                  >
                    <div className="overflow-hidden">
                      <span className="text-xs font-bold text-white block truncate">{ev.title}</span>
                      <span className="text-[10px] font-mono text-purple-300">
                        Dept: {ev.department} • Cap: {ev.capacity}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-pink-500/20 text-pink-300 font-mono text-xs font-bold shrink-0">
                      {ev.registrations} Enrolled
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USERS DIRECTORY & 3 TYPES OF ACCESS */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                  User Accounts & 3 Types of Access Permissions
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  Manage accounts and grant 3 access levels (Admin, Co-ordinator, Student) with 1-click toggles and zero duplicate email alerts.
                </p>
              </div>

              <button
                onClick={() => handleOpenUserModal()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-tech font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer self-start sm:self-auto shadow-lg shadow-cyan-600/30"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Grant Access / Add User</span>
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Total Accounts</span>
                <span className="text-2xl font-tech font-bold text-white mt-0.5 block">{usersList.length}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                <span className="text-[10px] font-mono text-cyan-400 uppercase block">👑 Administrators</span>
                <span className="text-2xl font-tech font-bold text-cyan-400 mt-0.5 block">
                  {usersList.filter(u => (Array.isArray(u.roles) && u.roles.includes('admin')) || u.role === 'admin').length}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                <span className="text-[10px] font-mono text-purple-400 uppercase block">📋 Co-ordinators</span>
                <span className="text-2xl font-tech font-bold text-purple-400 mt-0.5 block">{coordinatorsList.length}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                <span className="text-[10px] font-mono text-pink-400 uppercase block">🎓 Students / Participants</span>
                <span className="text-2xl font-tech font-bold text-pink-400 mt-0.5 block">{studentsList.length}</span>
              </div>
            </div>

            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by name, email, roll no, or college..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value as any)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-purple-900/60 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Access Types</option>
                <option value="student">Has Student Access</option>
                <option value="coordinator">Has Co-ordinator Access</option>
                <option value="admin">Has Administrator Access</option>
              </select>
            </div>

            {/* Users Table */}
            <div className="rounded-3xl bg-slate-950/80 border border-purple-900/40 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-purple-950/40 text-purple-300 font-mono text-[11px] uppercase border-b border-purple-900/50">
                    <tr>
                      <th className="p-4">User Details</th>
                      <th className="p-4">Contact Info</th>
                      <th className="p-4">3 Types of Access (Click to Toggle)</th>
                      <th className="p-4">Institution & Dept</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-950/60">
                    {filteredUsers.map((u) => {
                      const uRoles: UserRole[] = Array.isArray(u.roles) && u.roles.length > 0 
                        ? u.roles 
                        : [u.role || 'student'];
                      const hasAdmin = uRoles.includes('admin');
                      const hasCoord = uRoles.includes('coordinator');
                      const hasStudent = uRoles.includes('student');

                      return (
                        <tr key={u.id} className="hover:bg-purple-950/20 transition-colors">
                          <td className="p-4">
                            <span className="font-bold text-white block text-sm">{u.name}</span>
                            <span className="text-[11px] font-mono text-purple-300/80">
                              {u.rollNo || u.facultyId || `ID: ${u.id.slice(-6)}`}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="font-mono text-slate-200 block">{u.email}</span>
                            <span className="font-mono text-[11px] text-slate-400 block">{u.phone || 'No phone'}</span>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {/* Admin toggle */}
                              <button
                                type="button"
                                onClick={() => handleToggleUserAccess(u, 'admin')}
                                title="Click to grant/revoke Administrator access"
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase cursor-pointer transition-all ${
                                  hasAdmin 
                                    ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-500/40' 
                                    : 'bg-slate-900/60 text-slate-500 border border-slate-800 hover:text-slate-300 hover:border-slate-700'
                                }`}
                              >
                                {hasAdmin ? '👑 Admin' : '+ Admin'}
                              </button>

                              {/* Coordinator toggle */}
                              <button
                                type="button"
                                onClick={() => handleToggleUserAccess(u, 'coordinator')}
                                title="Click to grant/revoke Event Co-ordinator access"
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase cursor-pointer transition-all ${
                                  hasCoord 
                                    ? 'bg-purple-500/25 text-purple-300 border border-purple-500/50 hover:bg-purple-500/40' 
                                    : 'bg-slate-900/60 text-slate-500 border border-slate-800 hover:text-slate-300 hover:border-slate-700'
                                }`}
                              >
                                {hasCoord ? '📋 Coord' : '+ Coord'}
                              </button>

                              {/* Student toggle */}
                              <button
                                type="button"
                                onClick={() => handleToggleUserAccess(u, 'student')}
                                title="Click to grant/revoke Student / Participant access"
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase cursor-pointer transition-all ${
                                  hasStudent 
                                    ? 'bg-pink-500/25 text-pink-300 border border-pink-500/50 hover:bg-pink-500/40' 
                                    : 'bg-slate-900/60 text-slate-500 border border-slate-800 hover:text-slate-300 hover:border-slate-700'
                                }`}
                              >
                                {hasStudent ? '🎓 Student' : '+ Student'}
                              </button>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-slate-200 block truncate max-w-xs">{u.college}</span>
                            <span className="text-[10px] font-mono text-purple-400 uppercase font-bold">
                              Dept: {u.department}
                            </span>
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase cursor-pointer ${
                                u.status === 'active'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-red-500/20 text-red-300 border border-red-500/40'
                              }`}
                              title="Click to toggle account active status"
                            >
                              {u.status}
                            </button>
                          </td>
                          <td className="p-4 text-right space-x-1.5">
                            <button
                              onClick={() => setSelectedUserHistory(u)}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-purple-300 cursor-pointer"
                              title="Registration History & Passes"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenUserModal(u)}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 cursor-pointer"
                              title="Edit User Access & Info"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {u.id !== user.id && (
                              <button
                                onClick={() => requestDeleteUser(u.id, u.name)}
                                className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 cursor-pointer"
                                title="Delete User"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: STUDENTS DIRECTORY */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                  Registered Student Participants Directory
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  Comprehensive listing of all attendees who hold Student / Participant access across all universities.
                </p>
              </div>

              <button
                onClick={() => {
                  handleOpenUserModal();
                  setUserFormRoles(['student']);
                }}
                className="px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-tech font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer self-start sm:self-auto shadow-lg shadow-pink-600/30"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Register Student</span>
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                <span className="text-[10px] font-mono text-pink-300 uppercase block">Total Students</span>
                <span className="text-2xl font-tech font-bold text-white mt-0.5 block">{studentsList.length}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                <span className="text-[10px] font-mono text-cyan-300 uppercase block">LBRCE Enrolled</span>
                <span className="text-2xl font-tech font-bold text-cyan-400 mt-0.5 block">
                  {studentsList.filter(s => (s.college || '').includes('Lakireddy')).length}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                <span className="text-[10px] font-mono text-emerald-300 uppercase block">Other Colleges</span>
                <span className="text-2xl font-tech font-bold text-emerald-400 mt-0.5 block">
                  {studentsList.filter(s => !(s.college || '').includes('Lakireddy')).length}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                <span className="text-[10px] font-mono text-amber-300 uppercase block">Registrations Issued</span>
                <span className="text-2xl font-tech font-bold text-amber-400 mt-0.5 block">
                  {registrationsList.length}
                </span>
              </div>
            </div>

            {/* Filter Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search students by name, email, roll no, or college..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500"
              />
            </div>

            {/* Students Table */}
            <div className="rounded-3xl bg-slate-950/80 border border-purple-900/40 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-purple-950/40 text-pink-300 font-mono text-[11px] uppercase border-b border-purple-900/50">
                    <tr>
                      <th className="p-4">Student Name & Roll No</th>
                      <th className="p-4">Email Address</th>
                      <th className="p-4">College & Department</th>
                      <th className="p-4">Registered Passes</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-950/60">
                    {studentsList
                      .filter(s => {
                        const q = (userSearch || '').toLowerCase();
                        return (s.name || '').toLowerCase().includes(q) ||
                               (s.email || '').toLowerCase().includes(q) ||
                               (s.college || '').toLowerCase().includes(q) ||
                               (s.rollNo || '').toLowerCase().includes(q);
                      })
                      .map((s) => {
                        const count = (s as any).studentRegistrationsCount || 
                          registrationsList.filter(r => r.studentEmail?.toLowerCase() === s.email?.toLowerCase()).length;

                        return (
                          <tr key={s.id} className="hover:bg-purple-950/20 transition-colors">
                            <td className="p-4">
                              <span className="font-bold text-white block text-sm">{s.name}</span>
                              <span className="text-[11px] font-mono text-purple-300/80">
                                {s.rollNo || `ID: ${s.id.slice(-6)}`}
                              </span>
                            </td>
                            <td className="p-4 font-mono text-slate-300">{s.email}</td>
                            <td className="p-4">
                              <span className="text-slate-200 block truncate max-w-xs">{s.college}</span>
                              <span className="text-[10px] font-mono text-pink-400 uppercase font-bold">
                                Dept: {s.department}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="px-2.5 py-1 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40 font-mono font-bold text-[11px]">
                                {count} Event{count !== 1 ? 's' : ''}
                              </span>
                            </td>
                            <td className="p-4">
                              <button
                                onClick={() => handleToggleUserStatus(s)}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase cursor-pointer ${
                                  s.status === 'active'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-red-500/20 text-red-300 border border-red-500/40'
                                }`}
                              >
                                {s.status}
                              </button>
                            </td>
                            <td className="p-4 text-right space-x-1.5">
                              <button
                                onClick={() => setSelectedUserHistory(s)}
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-pink-300 cursor-pointer"
                                title="View Pass History"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenUserModal(s)}
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 cursor-pointer"
                                title="Edit Student"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: COORDINATORS DIRECTORY & EVENT ALLOCATIONS */}
        {activeTab === 'coordinators' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                  Faculty Co-ordinators Directory & Event Allocations
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  Full details of all symposium coordinators: contact details, managed competitions, live registrations, and multi-role assignments.
                </p>
              </div>

              <button
                onClick={() => {
                  handleOpenUserModal();
                  setUserFormRoles(['coordinator']);
                }}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-tech font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer self-start sm:self-auto shadow-lg shadow-purple-600/30"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Assign New Co-ordinator</span>
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                <span className="text-[10px] font-mono text-purple-300 uppercase block">Total Co-ordinators</span>
                <span className="text-2xl font-tech font-bold text-white mt-0.5 block">{coordinatorsList.length}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                <span className="text-[10px] font-mono text-cyan-300 uppercase block">Events Allocated</span>
                <span className="text-2xl font-tech font-bold text-cyan-400 mt-0.5 block">
                  {eventsList.length}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                <span className="text-[10px] font-mono text-pink-300 uppercase block">Active Branches</span>
                <span className="text-2xl font-tech font-bold text-pink-400 mt-0.5 block">
                  {new Set(coordinatorsList.map(c => c.department)).size}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                <span className="text-[10px] font-mono text-emerald-300 uppercase block">Total Managed Registrations</span>
                <span className="text-2xl font-tech font-bold text-emerald-400 mt-0.5 block">
                  {registrationsList.length}
                </span>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search coordinators by name, designation, department, or email..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Coordinators Detailed Table */}
            <div className="rounded-3xl bg-slate-950/80 border border-purple-900/40 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-purple-950/40 text-purple-300 font-mono text-[11px] uppercase border-b border-purple-900/50">
                    <tr>
                      <th className="p-4">Co-ordinator Details</th>
                      <th className="p-4">Contact & Affiliation</th>
                      <th className="p-4">Active Role Badges</th>
                      <th className="p-4">Managed Events & Registrations</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-950/60">
                    {coordinatorsList
                      .filter(c => {
                        const q = (userSearch || '').toLowerCase();
                        return (c.name || '').toLowerCase().includes(q) ||
                               (c.email || '').toLowerCase().includes(q) ||
                               (c.department || '').toLowerCase().includes(q) ||
                               (c.designation || '').toLowerCase().includes(q);
                      })
                      .map((c) => {
                        const uRoles: UserRole[] = Array.isArray(c.roles) && c.roles.length > 0 
                          ? c.roles 
                          : [c.role || 'coordinator'];
                        
                        // Find events coordinated by this user
                        const userEmail = (c.email || '').toLowerCase();
                        const myEvents = eventsList.filter(e => {
                          const coordId = e.coordinator ? String(e.coordinator) : '';
                          const coordEmail = (e.coordinatorEmail || '').toLowerCase();
                          return coordId === c.id || (coordEmail && coordEmail === userEmail);
                        });

                        const totalRegCount = (c as any).coordinatorRegistrationsCount ?? 
                          myEvents.reduce((acc, ev) => acc + (ev.registeredCount || 0), 0);

                        return (
                          <tr key={c.id} className="hover:bg-purple-950/20 transition-colors">
                            <td className="p-4">
                              <span className="font-bold text-white block text-sm">{c.name}</span>
                              <span className="text-[11px] font-mono text-purple-300/80 block">
                                {c.designation || 'Faculty Co-ordinator'}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {c.facultyId || c.rollNo || `ID: ${c.id.slice(-6)}`}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="font-mono text-slate-200 block">{c.email}</span>
                              <span className="font-mono text-[11px] text-slate-400 block">{c.phone || 'No phone'}</span>
                              <span className="text-[10px] font-mono text-purple-400 uppercase font-bold mt-0.5 block">
                                Dept: {c.department}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1">
                                {uRoles.map((r) => (
                                  <span
                                    key={r}
                                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                      r === 'admin' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
                                      r === 'coordinator' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
                                      'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                                    }`}
                                  >
                                    {r === 'admin' ? '👑 Admin' : r === 'coordinator' ? '📋 Coord' : '🎓 Student'}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-4">
                              {myEvents.length > 0 ? (
                                <div className="space-y-1">
                                  <div className="flex flex-wrap gap-1">
                                    {myEvents.slice(0, 3).map((ev) => (
                                      <span
                                        key={ev.id}
                                        className="px-2 py-0.5 rounded-md bg-purple-950/60 border border-purple-800/50 text-[10px] font-mono text-purple-200"
                                      >
                                        {ev.eventName} ({ev.registeredCount || 0}/{ev.maxParticipants})
                                      </span>
                                    ))}
                                    {myEvents.length > 3 && (
                                      <span className="text-[10px] font-mono text-purple-400">
                                        +{myEvents.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] font-mono text-emerald-400 block">
                                    ⚡ {totalRegCount} Total Enrolled Attendees
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[11px] font-mono text-slate-500 italic">
                                  No events currently assigned
                                </span>
                              )}
                            </td>
                            <td className="p-4">
                              <button
                                onClick={() => handleToggleUserStatus(c)}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase cursor-pointer ${
                                  c.status === 'active'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-red-500/20 text-red-300 border border-red-500/40'
                                }`}
                              >
                                {c.status}
                              </button>
                            </td>
                            <td className="p-4 text-right space-x-1.5">
                              <button
                                onClick={() => handleOpenUserModal(c)}
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 cursor-pointer"
                                title="Edit Co-ordinator & Permissions"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              {c.id !== user.id && (
                                <button
                                  onClick={() => requestDeleteUser(c.id, c.name)}
                                  className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 cursor-pointer"
                                  title="Delete Account"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: EVENTS MANAGEMENT */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                  Festival Events Management
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  Full control: create, edit, reassign, approve, cancel, or delete symposium competitions.
                </p>
              </div>

              <button
                onClick={() => handleOpenEventModal()}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-tech font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer self-start sm:self-auto shadow-lg shadow-purple-600/30"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Event</span>
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  placeholder="Search by event title, venue, or coordinator..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <select
                value={eventDeptFilter}
                onChange={(e) => setEventDeptFilter(e.target.value as DepartmentId)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-purple-900/60 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Departments</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.id}>{d.name.split(' (')[0]}</option>
                ))}
              </select>

              <select
                value={eventStatusFilter}
                onChange={(e) => setEventStatusFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-purple-900/60 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Statuses</option>
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Events Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredEvents.map((ev) => {
                const regCount = registrationsList.filter(r => r.eventId === ev.id).length;
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
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleEventApproval(ev)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase cursor-pointer ${
                              ev.approvalStatus === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            {ev.approvalStatus}
                          </button>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono uppercase">
                            {ev.status}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-white mb-1.5">{ev.eventName}</h3>
                      <p className="text-xs text-slate-300 line-clamp-2 mb-4">{ev.description}</p>

                      <div className="p-3 rounded-2xl bg-purple-950/20 border border-purple-900/30 text-xs font-mono space-y-1 mb-4">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Coordinator:</span>
                          <span className="text-white font-medium">{ev.coordinatorName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Enrolled:</span>
                          <span className="text-pink-300 font-bold">{regCount} / {ev.maxParticipants}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Venue:</span>
                          <span className="text-white">{ev.venue}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-purple-950">
                      <button
                        onClick={() => handleOpenEventModal(ev)}
                        className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 text-xs font-tech font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleDeleteEvent(ev.id, ev.eventName)}
                        className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 cursor-pointer"
                        title="Delete Event"
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

        {/* TAB 6: DEPARTMENTS */}
        {activeTab === 'departments' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                Departmental Arenas Overview (9 Branches)
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Department themes, assigned coordinators, events count, and prize vault allocations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {DEPARTMENTS.map((dept) => {
                const deptEvents = eventsList.filter(e => e.department === dept.id);
                const deptRegs = registrationsList.filter(r => r.department === dept.id).length;
                const coord = coordinatorsList.find(c => c.department === dept.id);
                return (
                  <div
                    key={dept.id}
                    className="p-5 rounded-3xl bg-slate-950/80 border border-purple-900/40 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-pink-400 uppercase">{dept.code}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold">
                        {deptEvents.length} Events
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white">{dept.name}</h3>
                    <p className="text-xs text-purple-300 font-mono">Theme: {dept.theme}</p>

                    <div className="p-3 rounded-2xl bg-purple-950/20 border border-purple-900/30 text-xs font-mono space-y-1">
                      <div>Coordinator: <span className="text-white font-medium">{coord ? coord.name : 'Central Admin'}</span></div>
                      <div>Total Registrations: <span className="text-pink-300 font-bold">{deptRegs}</span></div>
                      <div>Prize Vault: <span className="text-emerald-400">{dept.totalPrizes}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 7: REGISTRATIONS MASTER REGISTRY */}
        {activeTab === 'registrations' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                  Festival Master Registrations Registry
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  Real-time database of all student event registrations ({registrationsList.length} total).
                </p>
              </div>

              <button
                onClick={handleExportRegistrationsCSV}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 hover:from-purple-500 text-white text-xs font-tech font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer self-start sm:self-auto shadow-lg shadow-pink-600/30"
              >
                <Download className="w-4 h-4" />
                <span>Export Official CSV</span>
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={regSearch}
                  onChange={(e) => setRegSearch(e.target.value)}
                  placeholder="Search by student name, token, email, or event..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <select
                value={regCollegeFilter}
                onChange={(e) => setRegCollegeFilter(e.target.value as any)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-purple-900/60 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Participating Colleges</option>
                <option value="lbrce">LBRCE Students Only</option>
                <option value="other">Other Colleges Only</option>
              </select>
            </div>

            {/* Registry Table */}
            <div className="rounded-3xl bg-slate-950/80 border border-purple-900/40 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-purple-950/40 text-purple-300 font-mono text-[11px] uppercase border-b border-purple-900/50">
                    <tr>
                      <th className="p-4">Reg Token</th>
                      <th className="p-4">Student</th>
                      <th className="p-4">College</th>
                      <th className="p-4">Event</th>
                      <th className="p-4">Payment</th>
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-950/60">
                    {filteredRegistrations.map((reg) => (
                      <tr key={reg.id} className="hover:bg-purple-950/20 transition-colors">
                        <td className="p-4 font-mono font-bold text-cyan-400">{reg.id}</td>
                        <td className="p-4">
                          <span className="font-bold text-white block">{reg.studentName}</span>
                          <span className="text-[11px] text-slate-400">{reg.studentEmail}</span>
                        </td>
                        <td className="p-4 text-slate-300 truncate max-w-xs">{reg.college}</td>
                        <td className="p-4 font-medium text-pink-300">{reg.eventName}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            reg.paymentStatus === 'PAID'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : reg.paymentStatus === 'PENDING'
                              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                              : reg.paymentStatus === 'FREE'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'bg-red-500/20 text-red-300 border border-red-500/40'
                          }`}>
                            {reg.paymentStatus}
                          </span>
                          {reg.paymentAmount && Number(reg.paymentAmount) > 0 ? (
                            <span className="text-[10px] text-slate-400 block mt-1">₹{reg.paymentAmount}</span>
                          ) : reg.paymentStatus === 'FREE' ? (
                            <span className="text-[10px] text-cyan-400/70 block mt-1">Free Entry</span>
                          ) : null}
                        </td>
                        <td className="p-4 font-mono text-slate-400">
                          {new Date(reg.registrationDate).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            reg.status === 'confirmed'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-red-500/20 text-red-300 border border-red-500/40'
                          }`}>
                            {reg.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => requestDeleteRegistration(reg.id, reg.studentName, reg.eventName)}
                            className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 cursor-pointer"
                            title="Delete Registration"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: PARTICIPANT FOOD TOKENS (FOR EVENT REGISTERED PARTICIPANTS ONLY) */}
        {activeTab === 'food-tokens' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Utensils className="w-6 h-6" />
                  </span>
                  Participant Food Tokens & Dining Passes
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  Generate, track, and email food tokens strictly for students registered in symposium events (excludes general unenrolled users).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    SoundEngine.playClick();
                    const cpnData = await dbService.getAllFoodCoupons();
                    setAdminFoodCoupons(cpnData.coupons || []);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 border border-emerald-900/50 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-mono flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Refresh List</span>
                </button>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-purple-900/40">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Event Registrations
                </span>
                <span className="text-2xl font-bold font-mono text-pink-400">
                  {registrationsList.filter((r) => r.status === 'confirmed').length}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-purple-900/40">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Total Issued Tokens
                </span>
                <span className="text-2xl font-bold font-mono text-cyan-400">
                  {adminFoodCoupons.length}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-purple-900/40">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Active Tokens
                </span>
                <span className="text-2xl font-bold font-mono text-emerald-400">
                  {adminFoodCoupons.filter((c) => c.status === 'ACTIVE').length}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-purple-900/40">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Redeemed Tokens
                </span>
                <span className="text-2xl font-bold font-mono text-purple-400">
                  {adminFoodCoupons.filter((c) => c.status === 'USED').length}
                </span>
              </div>
            </div>

            {/* Bulk Token Generator Action Banner */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#061e16] via-slate-950 to-[#0a1526] border border-emerald-500/50 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 max-w-3xl space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-mono font-bold text-emerald-300">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  EVENT PARTICIPANTS ONLY
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-heading">
                  Generate Food Tokens for Coordinators
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Click below to generate food tokens for all confirmed symposium event registrations. Tokens are issued to coordinators, who then email them directly to participants. Students without event registrations are automatically excluded.
                </p>

                <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <button
                    onClick={async () => {
                      setBulkGenerateResult(null);
                      setIsBulkGeneratingTokens(true);
                      try {
                        const res = await dbService.bulkGenerateTokensForEventParticipants();
                        SoundEngine.playSuccess();
                        setBulkGenerateResult(res);
                        // Refresh coupons list
                        const cpnData = await dbService.getAllFoodCoupons();
                        setAdminFoodCoupons(cpnData.coupons || []);
                      } catch (err: any) {
                        SoundEngine.playClick();
                        setBulkGenerateResult({
                          success: false,
                          message: err.message || 'Bulk token generation failed.',
                        });
                      } finally {
                        setIsBulkGeneratingTokens(false);
                      }
                    }}
                    disabled={isBulkGeneratingTokens}
                    className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500 text-white font-tech font-extrabold text-xs uppercase tracking-wider shadow-xl shadow-emerald-600/30 flex items-center gap-2.5 cursor-pointer disabled:opacity-50 transition-all hover:scale-[1.02]"
                  >
                    <Utensils className="w-4 h-4" />
                    <span>
                      {isBulkGeneratingTokens
                        ? 'Scanning Registrations & Dispatching...'
                        : 'Generate Tokens for All Event Participants'}
                    </span>
                  </button>

                  <span className="text-[11px] font-mono text-slate-400">
                    Target: {registrationsList.filter((r) => r.status === 'confirmed').length} confirmed event entries
                  </span>
                </div>
              </div>
            </div>

            {/* ADMIN: Send Coupons To Any Mail (irrespective of event participation) */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#1a0830] via-slate-950 to-[#0a1526] border border-purple-500/50 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-[11px] font-mono font-bold text-purple-300">
                  <MailCheck className="w-3.5 h-3.5 text-purple-400" />
                  ADMIN DIRECT DISPATCH
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-heading">
                  Send Coupons to Any Email
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Generate an official food coupon and dispatch it instantly to any email address — irrespective of whether they registered for an event or not.
                </p>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!manualCouponEmail.trim()) return;
                    setManualCouponResult(null);
                    setIsSendingManualCoupon(true);
                    try {
                      const res = await dbService.sendCouponToEmail(
                        manualCouponEmail.trim(),
                        manualCouponName.trim() || undefined
                      );
                      SoundEngine.playSuccess();
                      setManualCouponResult({
                        success: res.success,
                        message: res.message,
                        coupon: res.coupon,
                      });
                      setManualCouponEmail('');
                      setManualCouponName('');
                      const cpnData = await dbService.getAllFoodCoupons();
                      setAdminFoodCoupons(cpnData.coupons || []);
                    } catch (err: any) {
                      SoundEngine.playClick();
                      setManualCouponResult({ success: false, message: err.message || 'Failed to send coupon to email.' });
                    } finally {
                      setIsSendingManualCoupon(false);
                    }
                  }}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={manualCouponName}
                      onChange={(e) => setManualCouponName(e.target.value)}
                      placeholder="Recipient name (optional)"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-purple-400"
                    />
                    <input
                      type="email"
                      value={manualCouponEmail}
                      onChange={(e) => setManualCouponEmail(e.target.value)}
                      placeholder="Recipient email address *"
                      required
                      className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-purple-900/60 text-white text-sm font-mono focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSendingManualCoupon || !manualCouponEmail.trim()}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 hover:from-purple-500 hover:to-pink-500 text-white font-tech font-extrabold text-xs uppercase tracking-wider shadow-xl shadow-purple-600/30 flex items-center gap-2.5 cursor-pointer disabled:opacity-50 transition-all self-end"
                  >
                    <MailCheck className="w-4 h-4" />
                    <span>{isSendingManualCoupon ? 'Generating & Sending...' : 'Send Coupon to Mail'}</span>
                  </button>
                </form>

                {manualCouponResult && (
                  <div
                    className={`p-4 rounded-2xl border text-xs sm:text-sm ${
                      manualCouponResult.success
                        ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200'
                        : 'bg-red-950/80 border-red-500/60 text-red-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {manualCouponResult.success ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p>{manualCouponResult.message}</p>
                        {manualCouponResult.coupon && (
                          <p className="mt-1 font-mono text-purple-300">
                            Coupon: {manualCouponResult.coupon.couponCode} • Status: {manualCouponResult.coupon.status}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Results Alert */}
            {bulkGenerateResult && (
              <div
                className={`p-5 rounded-2xl border text-xs sm:text-sm animate-in fade-in duration-200 ${
                  bulkGenerateResult.success
                    ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200'
                    : 'bg-red-950/80 border-red-500/60 text-red-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {bulkGenerateResult.success ? (
                      <MailCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p className="font-bold text-white">{bulkGenerateResult.message}</p>
                      {bulkGenerateResult.stats && (
                        <div className="flex flex-wrap gap-4 text-xs font-mono text-emerald-300/90 pt-1">
                          <span>Unique Participants: <strong>{bulkGenerateResult.stats.uniqueParticipants}</strong></span>
                          <span>•</span>
                          <span>New Tokens Created: <strong>{bulkGenerateResult.stats.newTokensGenerated}</strong></span>
                          <span>•</span>
                          <span>Already Had Token: <strong>{bulkGenerateResult.stats.alreadyHadTokens}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setBulkGenerateResult(null)}
                    className="p-1 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Tokens Table Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={tokenSearch}
                  onChange={(e) => setTokenSearch(e.target.value)}
                  placeholder="Search by token code, student name, email, or institution..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-purple-900/60 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={tokenStatusFilter}
                onChange={(e: any) => setTokenStatusFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-purple-900/60 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Token Statuses</option>
                <option value="ACTIVE">ACTIVE Only</option>
                <option value="USED">USED Only</option>
                <option value="EXPIRED">EXPIRED Only</option>
              </select>
            </div>

            {/* Issued Tokens Table */}
            <div className="rounded-3xl bg-slate-950/80 border border-purple-900/40 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-purple-950/40 text-purple-300 font-mono text-[11px] uppercase border-b border-purple-900/50">
                    <tr>
                      <th className="p-4">Token Code</th>
                      <th className="p-4">Participant Name</th>
                      <th className="p-4">Registered Email</th>
                      <th className="p-4">Institution</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Issued At</th>
                      <th className="p-4">Redemption Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-950/50 font-mono">
                    {adminFoodCoupons
                      .filter((c) => {
                        const q = tokenSearch.toLowerCase();
                        const matchSearch =
                          c.couponCode.toLowerCase().includes(q) ||
                          c.userName.toLowerCase().includes(q) ||
                          c.userEmail.toLowerCase().includes(q) ||
                          c.college.toLowerCase().includes(q);
                        const matchStatus = tokenStatusFilter === 'all' || c.status === tokenStatusFilter;
                        return matchSearch && matchStatus;
                      })
                      .map((coupon) => (
                        <tr key={coupon.id || coupon.couponCode} className="hover:bg-purple-950/20 transition-colors">
                          <td className="p-4 font-bold text-emerald-300">
                            {coupon.couponCode}
                          </td>
                          <td className="p-4 text-white font-sans font-medium">
                            {coupon.userName}
                          </td>
                          <td className="p-4 text-slate-300">
                            {coupon.userEmail}
                          </td>
                          <td className="p-4 text-slate-400 font-sans truncate max-w-[200px]">
                            {coupon.college.split(' (')[0]}
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                coupon.status === 'ACTIVE'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : coupon.status === 'USED'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                  : 'bg-red-500/20 text-red-300 border border-red-500/40'
                              }`}
                            >
                              {coupon.status}
                            </span>
                          </td>
                          <td className="p-4 text-slate-400 text-[11px]">
                            {new Date(coupon.generatedDate || coupon.createdAt || Date.now()).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-slate-400 text-[11px]">
                            {coupon.status === 'USED' ? (
                              <span className="text-purple-300">
                                Redeemed by {coupon.redeemedBy || 'Staff'} on{' '}
                                {coupon.redeemedAt ? new Date(coupon.redeemedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                        </tr>
                      ))}

                    {adminFoodCoupons.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 font-sans">
                          No participant food tokens generated yet. Click "Generate Tokens for All Event Participants" above to issue tokens.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: PARTICIPATING COLLEGES */}
        {activeTab === 'colleges' && analytics && (

          <div className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                Participating Colleges & Universities
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Institutional representation ranking based on live registration data ({analytics.users.participatingColleges} colleges).
              </p>
            </div>

            {/* Host Institution Landmark Card */}
            <div className="rounded-3xl bg-slate-950/80 border border-purple-800/50 overflow-hidden shadow-2xl">
              <div className="relative h-48 sm:h-56 w-full overflow-hidden group">
                <img
                  src="/assets/lbrce_campus.jpg"
                  alt="Lakireddy Bali Reddy College of Engineering Campus"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-purple-700/50 text-xs font-mono text-pink-300 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-pink-400" /> Host Institution Headquarters
                </div>
                <div className="absolute bottom-4 left-5 right-5 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold font-heading text-white">
                      Lakireddy Bali Reddy College of Engineering
                    </h3>
                    <p className="text-xs text-purple-200/90 font-mono">
                      Mylavaram, NTR Dist • Autonomous • NAAC A+ • NBA Accredited • 65 Acres
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-pink-500/25 border border-pink-500/40 text-pink-300 text-xs font-mono font-bold self-start sm:self-auto backdrop-blur-md">
                    Symposium Arena
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-slate-950/80 border border-purple-900/40 overflow-hidden">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-purple-950/40 text-purple-300 font-mono text-[11px] uppercase border-b border-purple-900/50">
                  <tr>
                    <th className="p-4">Rank</th>
                    <th className="p-4">Institution Name</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 text-right">Student Registrations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-950/60">
                  {(analytics.registrations.collegeStats || []).map((col: any, idx: number) => {
                    const isLBRCE = col.fullName.includes('Lakireddy Bali Reddy');
                    return (
                      <tr key={idx} className="hover:bg-purple-950/20 transition-colors">
                        <td className="p-4 font-mono font-bold text-cyan-400">#{idx + 1}</td>
                        <td className="p-4 font-medium text-white">{col.fullName}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            isLBRCE ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          }`}>
                            {isLBRCE ? 'Host Institute' : 'External Affiliate'}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-pink-400 text-sm">
                          {col.count}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 9: REPORTS & TAB 10: ANALYTICS */}
        {(activeTab === 'reports' || activeTab === 'analytics') && analytics && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                Symposium Intelligence & Reports
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Comprehensive metrics summary ready for fest committee audit and presentation.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-950/80 border border-purple-900/40 space-y-4">
              <h3 className="font-heading font-bold text-lg text-white">Audit Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-900/30">
                  <span className="text-slate-400 block mb-1">Host Students (LBRCE):</span>
                  <span className="text-2xl font-bold text-pink-400">{analytics.registrations.lbrceRegistrations}</span>
                </div>
                <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-900/30">
                  <span className="text-slate-400 block mb-1">Visiting Students:</span>
                  <span className="text-2xl font-bold text-cyan-400">{analytics.registrations.otherCollegeRegistrations}</span>
                </div>
                <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-900/30">
                  <span className="text-slate-400 block mb-1">Cross-Event Participation:</span>
                  <span className="text-2xl font-bold text-emerald-400">{analytics.registrations.multiEventStudentsCount}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: ANNOUNCEMENTS */}
        {activeTab === 'announcements' && (
          <AdminAnnouncementsSection
            currentUser={user}
            showToast={showToast}
          />
        )}

        {/* TAB 11: PROFILE & TAB 12: SETTINGS */}
        {(activeTab === 'profile' || activeTab === 'settings') && (
          <div className="max-w-3xl space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                Admin Profile & System Settings
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Manage super-administrator credentials, root security, and campus authority.
              </p>
            </div>

            {adminProfileSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{adminProfileSuccess}</span>
              </div>
            )}

            {adminProfileError && (
              <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-mono flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{adminProfileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAdminProfile} className="p-6 sm:p-8 rounded-3xl bg-slate-950/80 border border-purple-900/40 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Administrator Name
                  </label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    System Email
                  </label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/50 border border-purple-900/30 text-cyan-400 font-mono text-sm cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Authority Level
                  </label>
                  <div className="px-4 py-2.5 rounded-xl bg-slate-900/50 border border-purple-900/30 text-emerald-400 font-mono text-sm font-bold uppercase">
                    Super Administrator
                  </div>
                </div>
              </div>

              <div className="pt-5 border-t border-purple-900/50 space-y-4">
                <div className="flex items-center gap-2 text-cyan-300 text-sm font-bold font-heading">
                  <KeyRound className="w-4 h-4 text-cyan-400" />
                  <span>Update Admin Password</span>
                </div>
                <p className="text-xs text-slate-400">
                  Enter a new administrator password below. Leave blank to keep your current password.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showAdminPassword ? 'text' : 'password'}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Enter new password (min. 4 chars)"
                        className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      value={adminConfirmPassword}
                      onChange={(e) => setAdminConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500">
                  Institution: <strong className="text-purple-300">LBRCE Central Administration</strong>
                </span>
                <button
                  type="submit"
                  disabled={isAdminSaving}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-tech font-bold uppercase tracking-wider shadow-lg shadow-cyan-600/30 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {isAdminSaving ? 'Updating...' : 'Save Admin Profile & Password'}
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
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-purple-800/40 text-[11px] font-mono text-cyan-300 font-bold">
                  Administrative Headquarters
                </div>
              </div>
              <div className="p-5 sm:p-6">
                <h4 className="text-lg font-bold font-heading text-white mb-1">
                  Lakireddy Bali Reddy College of Engineering (Autonomous)
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Mylavaram, Krishna District, Andhra Pradesh. Administrative block overseeing National Techno-Cultural Fest Lakshya 2026.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* USER ADD / GRANT ACCESS MODAL */}
        {userModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget) setUserModalOpen(false); }}
          >
            <div className="relative w-full max-w-lg rounded-3xl bg-slate-950 border border-purple-800/60 p-6 sm:p-8 space-y-4 my-8 shadow-2xl shadow-purple-950/70">
              <button
                onClick={() => setUserModalOpen(false)}
                className="absolute right-4 top-4 p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <h3 className="text-xl font-bold font-heading text-white">
                  {editingUser ? 'Edit User Access & Details' : 'Grant / Manage User Access'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Assign any combination of the 3 access types. If an account already exists for this email, privileges will be merged immediately without duplicate errors.
                </p>
              </div>

              {userFormError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{userFormError}</span>
                </div>
              )}

              {/* Duplicate Email Helper Hint */}
              {usersList.some(u => u.email.toLowerCase() === userFormEmail.trim().toLowerCase()) && !editingUser && (
                <div className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-[11px] font-mono text-cyan-200 flex items-center gap-2 animate-in fade-in">
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Existing user found! Saving will grant the selected access privileges to this account seamlessly.</span>
                </div>
              )}

              <form onSubmit={handleSaveUser} className="space-y-4 text-xs font-sans">
                <div>
                  <label className="block text-slate-400 font-mono uppercase mb-1">Full Name *</label>
                  <input
                    required
                    type="text"
                    value={userFormName}
                    onChange={(e) => setUserFormName(e.target.value)}
                    placeholder="Enter participant name"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono uppercase mb-1">Email Address *</label>
                  <input
                    required
                    type="email"
                    value={userFormEmail}
                    onChange={(e) => setUserFormEmail(e.target.value)}
                    placeholder="user@lbrce.ac.in or gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* 3 TYPES OF ACCESS SELECTION */}
                <div>
                  <label className="block text-cyan-300 font-mono uppercase font-bold mb-2">
                    Access Privileges (Select all that apply) *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Student Access */}
                    <button
                      type="button"
                      onClick={() => {
                        if (userFormRoles.includes('student')) {
                          if (userFormRoles.length > 1) setUserFormRoles(userFormRoles.filter(r => r !== 'student'));
                        } else {
                          setUserFormRoles([...userFormRoles, 'student']);
                        }
                      }}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        userFormRoles.includes('student')
                          ? 'bg-pink-950/50 border-pink-500 text-white shadow-md shadow-pink-950/40'
                          : 'bg-slate-900/60 border-purple-900/50 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">🎓 Student</span>
                        <input
                          type="checkbox"
                          checked={userFormRoles.includes('student')}
                          readOnly
                          className="accent-pink-500"
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 mt-1">
                        Register, passes & events
                      </span>
                    </button>

                    {/* Coordinator Access */}
                    <button
                      type="button"
                      onClick={() => {
                        if (userFormRoles.includes('coordinator')) {
                          if (userFormRoles.length > 1) setUserFormRoles(userFormRoles.filter(r => r !== 'coordinator'));
                        } else {
                          setUserFormRoles([...userFormRoles, 'coordinator']);
                        }
                      }}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        userFormRoles.includes('coordinator')
                          ? 'bg-purple-950/50 border-purple-500 text-white shadow-md shadow-purple-950/40'
                          : 'bg-slate-900/60 border-purple-900/50 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">📋 Co-ordinator</span>
                        <input
                          type="checkbox"
                          checked={userFormRoles.includes('coordinator')}
                          readOnly
                          className="accent-purple-500"
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 mt-1">
                        Manage events & attendees
                      </span>
                    </button>

                    {/* Admin Access */}
                    <button
                      type="button"
                      onClick={() => {
                        if (userFormRoles.includes('admin')) {
                          if (userFormRoles.length > 1) setUserFormRoles(userFormRoles.filter(r => r !== 'admin'));
                        } else {
                          setUserFormRoles([...userFormRoles, 'admin']);
                        }
                      }}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        userFormRoles.includes('admin')
                          ? 'bg-cyan-950/50 border-cyan-500 text-white shadow-md shadow-cyan-950/40'
                          : 'bg-slate-900/60 border-purple-900/50 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">👑 Admin</span>
                        <input
                          type="checkbox"
                          checked={userFormRoles.includes('admin')}
                          readOnly
                          className="accent-cyan-500"
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 mt-1">
                        Super-admin portal rights
                      </span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-mono uppercase mb-1">Department *</label>
                    <select
                      value={userFormDepartment}
                      onChange={(e) => setUserFormDepartment(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-900/60 text-white font-mono"
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
                      <option value="Central Administration">Central Administration</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-mono uppercase mb-1">Roll / Student ID</label>
                    <input
                      type="text"
                      value={userFormRollNo}
                      onChange={(e) => setUserFormRollNo(e.target.value)}
                      placeholder="e.g. 23LBRCE-001"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-900/60 text-white font-mono"
                    />
                  </div>
                </div>

                {/* Coordinator specific fields if coordinator role is active */}
                {userFormRoles.includes('coordinator') && (
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-purple-950/30 border border-purple-800/40 animate-in fade-in">
                    <div>
                      <label className="block text-purple-300 font-mono uppercase mb-1">Faculty ID</label>
                      <input
                        type="text"
                        value={userFormFacultyId}
                        onChange={(e) => setUserFormFacultyId(e.target.value)}
                        placeholder="e.g. FAC-CSE-042"
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-purple-800/50 text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-purple-300 font-mono uppercase mb-1">Designation</label>
                      <input
                        type="text"
                        value={userFormDesignation}
                        onChange={(e) => setUserFormDesignation(e.target.value)}
                        placeholder="e.g. Associate Professor"
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-purple-800/50 text-white text-xs"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-slate-400 font-mono uppercase mb-1">College / University</label>
                  <input
                    type="text"
                    value={userFormCollege}
                    onChange={(e) => setUserFormCollege(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-900/60 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-mono uppercase mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={userFormPhone}
                      onChange={(e) => setUserFormPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-900/60 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-mono uppercase mb-1">
                      Password {editingUser ? '(Leave blank to keep)' : '*'}
                    </label>
                    <input
                      type="password"
                      value={userFormPassword}
                      onChange={(e) => setUserFormPassword(e.target.value)}
                      placeholder={editingUser ? '••••••••' : 'welcome123'}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-900/60 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 text-white font-tech text-xs font-bold uppercase tracking-wider shadow-lg shadow-cyan-600/30 cursor-pointer transition-all"
                  >
                    {editingUser ? 'Update User Access & Privileges' : 'Grant Selected Access Privileges'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EVENT ADD/EDIT MODAL */}
        {eventModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget) setEventModalOpen(false); }}
          >
            <div className="relative w-full max-w-xl rounded-3xl bg-slate-950 border border-purple-800/60 p-6 sm:p-8 space-y-4 my-8">
              <button
                onClick={() => setEventModalOpen(false)}
                className="absolute right-4 top-4 p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-bold font-heading text-white">
                {editingEvent ? 'Admin: Edit Event Record' : 'Admin: Create New Event'}
              </h3>

              <form onSubmit={handleSaveEvent} className="space-y-3 text-xs font-sans">
                <div>
                  <label className="block text-slate-400 font-mono uppercase mb-1">Event Name *</label>
                  <input
                    required
                    type="text"
                    value={evName}
                    onChange={(e) => setEvName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-900/60 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono uppercase mb-1">Description *</label>
                  <textarea
                    required
                    rows={2}
                    value={evDescription}
                    onChange={(e) => setEvDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-900/60 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-mono uppercase mb-1">Department</label>
                    <select
                      value={evDept}
                      onChange={(e) => setEvDept(e.target.value as DepartmentId)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-900/60 text-white font-mono"
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d.id} value={d.id}>{d.name.split(' (')[0]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-mono uppercase mb-1">Assign Coordinator</label>
                    <select
                      value={evCoord}
                      onChange={(e) => setEvCoord(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-900/60 text-white font-mono"
                    >
                      {coordinatorsList.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.department.toUpperCase()})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-mono uppercase mb-1">Status</label>
                    <select
                      value={evStatus}
                      onChange={(e) => setEvStatus(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-900/60 text-white font-mono"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-mono uppercase mb-1">Approval</label>
                    <select
                      value={evApproval}
                      onChange={(e) => setEvApproval(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-900/60 text-white font-mono"
                    >
                      <option value="approved">Approved</option>
                      <option value="pending">Pending</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-mono uppercase mb-1">Venue</label>
                    <input
                      type="text"
                      value={evVenue}
                      onChange={(e) => setEvVenue(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-900/60 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-mono uppercase mb-1">Time</label>
                    <input
                      type="text"
                      value={evTime}
                      onChange={(e) => setEvTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-900/60 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-mono uppercase mb-1">Date</label>
                    <input
                      type="date"
                      value={evDate}
                      onChange={(e) => setEvDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-900/60 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-mono uppercase mb-1">Registration Deadline</label>
                    <input
                      type="text"
                      value={evDeadline}
                      onChange={(e) => setEvDeadline(e.target.value)}
                      placeholder="YYYY-MM-DD HH:MM AM/PM"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-900/60 text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white font-tech text-xs font-bold uppercase tracking-wider"
                >
                  Save Event Record
                </button>
              </form>
            </div>
          </div>
        )}

        {/* USER REGISTRATION HISTORY MODAL */}
        {selectedUserHistory && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedUserHistory(null); }}
          >
            <div className="relative w-full max-w-lg rounded-3xl bg-slate-950 border border-purple-800/60 p-6 sm:p-8 space-y-4">
              <button
                onClick={() => setSelectedUserHistory(null)}
                className="absolute right-4 top-4 p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-bold font-heading text-white">
                Registration History: {selectedUserHistory.name}
              </h3>
              <p className="text-xs font-mono text-purple-300">
                {selectedUserHistory.email} • {selectedUserHistory.college}
              </p>

              {registrationsList.filter(r => r.studentEmail.toLowerCase() === selectedUserHistory.email.toLowerCase()).length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  No event registrations found on record for this user.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {registrationsList
                    .filter(r => r.studentEmail.toLowerCase() === selectedUserHistory.email.toLowerCase())
                    .map((r) => (
                      <div key={r.id} className="p-3 rounded-xl bg-purple-950/20 border border-purple-900/30 text-xs font-mono flex justify-between items-center">
                        <div>
                          <span className="font-bold text-white block">{r.eventName}</span>
                          <span className="text-[10px] text-slate-400">{r.id} • {new Date(r.registrationDate).toLocaleDateString()}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-300">
                          {r.status}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* IN-APP CONFIRM DELETE MODAL */}
        <ConfirmDeleteModal
          isOpen={deleteModalConfig.isOpen}
          title={deleteModalConfig.title}
          message={deleteModalConfig.message}
          itemName={deleteModalConfig.name}
          confirmText="Yes, Delete Permanently"
          cancelText="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteModalConfig(prev => ({ ...prev, isOpen: false }))}
        />
      </main>
    </div>
  );
};
