import {
  User,
  ManagedEvent,
  Registration,
  NotificationItem,
  SupportReport,
  UserRole,
  DepartmentId,
  EventCategory,
  EventItem,
  FoodCoupon,
} from '../types';

import { EVENTS_DATA } from '../data/lakshyaData';

export function managedEventToEventItem(m: ManagedEvent): EventItem {
  const deptAccents: Record<string, string> = {
    all: '#ec4899',
    cse: '#06b6d4',
    it: '#8b5cf6',
    aids: '#ec4899',
    aiml: '#10b981',
    ece: '#f59e0b',
    eee: '#eab308',
    mech: '#f97316',
    civil: '#14b8a6',
    aero: '#6366f1',
  };

  return {
    id: m.id,
    title: m.eventName,
    deptId: m.department || 'cse',
    category: m.category || 'technical',
    tagline:
      m.description && m.description.length > 85
        ? m.description.slice(0, 85) + '...'
        : m.description || 'Official LBRCE Lakshya Competition',
    description: m.description || 'LBRCE Lakshya 2026 National Level Symposium competition.',
    prizes: {
      first: m.prizes?.first || '₹10,000',
      second: m.prizes?.second || '₹5,000',
      third: m.prizes?.third,
    },
    entryFee: m.entryFee || '₹150',
    teamSize: m.teamSize || '1-3 Members',
    venue: m.venue || 'LBRCE Campus',
    timing: m.time || '10:00 AM - 01:00 PM',
    rounds:
      m.rounds && m.rounds.length > 0
        ? m.rounds
        : [
            { name: 'Round 1: Preliminary Evaluation', description: 'Core problem statement and qualification round.' },
            { name: 'Round 2: Grand Finals & Presentation', description: 'Working demonstration and jury defense.' },
          ],
    rules:
      m.rules && m.rules.length > 0
        ? m.rules
        : [
            'Valid student college ID is mandatory for campus entry.',
            'Decisions made by the faculty coordinators and jury are final.',
            'Adherence to the schedule and code of conduct is strictly required.',
          ],
    coordinators: [
      {
        name: m.coordinatorName || 'Faculty Coordinator',
        role: 'Faculty / Event Lead',
        phone: '+91 866 2883900',
      },
    ],
    accentColor: deptAccents[m.department] || '#ec4899',
    featured: true,
  };
}

export const PARTICIPATING_COLLEGES = [
  'Lakireddy Bali Reddy College of Engineering (Autonomous)',
  'JNTU Kakinada (University College of Engg)',
  'VR Siddhartha Engineering College, Vijayawada',
  'KL University, Vaddeswaram',
  'Vignan Foundation for Science, Tech & Research, Guntur',
  'RVR & JC College of Engineering, Guntur',
  'Andhra University College of Engineering, Visakhapatnam',
  'SRKR Engineering College, Bhimavaram',
  'Vasireddy Venkatadri Institute of Technology (VVIT), Guntur',
  'Bapatla Engineering College, Bapatla',
  'GMR Institute of Technology (GMRIT), Rajam',
  'VIT-AP University, Amaravati',
];

const AUTH_SESSION_KEY = 'lakshya_auth_session_v2';
const AUTH_TOKEN_KEY = 'lakshya_jwt_token';
const EVENTS_CACHE_KEY = 'lakshya_events_cache_v2';
const REGISTRATIONS_CACHE_KEY = 'lakshya_registrations_cache_v2';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export class DatabaseService {
  private eventsCache: ManagedEvent[] = [];
  private registrationsCache: Registration[] = [];

  constructor() {
    // Load initial events from local storage cache or defaults for zero-latency initial UI paint
    try {
      const cachedEvt = localStorage.getItem(EVENTS_CACHE_KEY);
      if (cachedEvt) {
        this.eventsCache = JSON.parse(cachedEvt);
      } else {
        this.eventsCache = EVENTS_DATA.map((e) => ({
          id: e.id,
          eventName: e.title,
          description: e.description,
          department: e.deptId,
          category: e.category,
          coordinator: 'admin-convener',
          coordinatorName: e.coordinators[0]?.name || 'Coordinator',
          date: 'Feb 20-21, 2026',
          time: e.timing,
          venue: e.venue,
          registrationDeadline: '2026-02-19T23:59:59Z',
          maxParticipants: 100,
          entryFee: e.entryFee,
          registrationFee: e.entryFee,
          teamSize: e.teamSize,
          prizes: e.prizes,
          status: 'upcoming',
          approvalStatus: 'approved',
          createdAt: new Date().toISOString(),
          rules: e.rules,
          rounds: e.rounds,
        }));
      }

      const cachedReg = localStorage.getItem(REGISTRATIONS_CACHE_KEY);
      if (cachedReg) {
        this.registrationsCache = JSON.parse(cachedReg);
      }
    } catch {
      // safe fallback
    }

    // Proactively sync from backend in background
    this.syncEvents();
    this.syncRegistrations();
  }

  public async syncEvents(): Promise<ManagedEvent[]> {
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.events)) {
          this.eventsCache = data.events.map((e: any) => ({
            id: e.id || e._id,
            eventName: e.eventName || e.title,
            description: e.description,
            department: e.department,
            category: e.category,
            coordinator: e.coordinator,
            coordinatorName: e.coordinatorName,
            coordinatorEmail: e.coordinatorEmail,
            date: e.date,
            time: e.time,
            venue: e.venue,
            registrationDeadline: e.registrationDeadline,
            maxParticipants: e.maxParticipants,
            registeredCount: e.registeredCount,
            entryFee: e.entryFee,
            registrationFee: e.registrationFee || e.entryFee,
            feeAmount: e.feeAmount,
            isPaid: e.isPaid,
            teamSize: e.teamSize,
            prizes: e.prizes,
            status: e.status,
            approvalStatus: e.approvalStatus,
            createdAt: e.createdAt,
            rules: e.rules,
            rounds: e.rounds,
          }));
          localStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify(this.eventsCache));
        }
      }
    } catch {
      // Backend not reached, keep cached
    }
    return this.eventsCache;
  }

  public async syncRegistrations(): Promise<Registration[]> {
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) return this.registrationsCache;

      const res = await fetch('/api/registrations/my', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.registrations)) {
          this.registrationsCache = data.registrations;
          localStorage.setItem(REGISTRATIONS_CACHE_KEY, JSON.stringify(this.registrationsCache));
        }
      }
    } catch {
      // Ignore background sync failure
    }
    return this.registrationsCache;
  }

  // Auth Methods
  public getCurrentUser(): Omit<User, 'passwordHash'> | null {
    try {
      const sess = localStorage.getItem(AUTH_SESSION_KEY);
      return sess ? JSON.parse(sess) : null;
    } catch {
      return null;
    }
  }

  public switchActiveRole(role: UserRole): Omit<User, 'passwordHash'> | null {
    const current = this.getCurrentUser();
    if (!current) return null;
    const updated = { ...current, role };
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(updated));
    return updated;
  }

  public async login(
    email: string,
    password: string,
    role?: UserRole
  ): Promise<Omit<User, 'passwordHash'>> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (data.needsEmailVerification) {
        const err: any = new Error(data.message || 'Email verification required.');
        err.needsEmailVerification = true;
        err.email = data.email || email;
        throw err;
      }
      throw new Error(data.message || 'Login failed.');
    }

    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(data.user));
    await this.syncRegistrations();
    return data.user;
  }

  public async registerUser(userData: {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
    college?: string;
    department?: string;
    phone?: string;
    rollNo?: string;
  }): Promise<Omit<User, 'passwordHash'>> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Registration failed.');
    }

    if (data.token) {
      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    }
    if (data.user) {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(data.user));
    }
    await this.syncRegistrations();
    return data.user;
  }

  public async verifyEmail(email: string, otp: string): Promise<Omit<User, 'passwordHash'>> {
    const res = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Email verification failed.');
    }

    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(data.user));
    await this.syncRegistrations();
    return data.user;
  }

  public async resendOTP(email: string, purpose: 'EMAIL_VERIFY' | 'PASSWORD_RESET' = 'EMAIL_VERIFY'): Promise<string> {
    const res = await fetch('/api/auth/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, purpose }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to resend OTP.');
    }
    return data.message;
  }

  public async forgotPassword(email: string): Promise<string> {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to initiate password reset.');
    }
    return data.message;
  }

  public async verifyResetOTP(email: string, otp: string): Promise<string> {
    const res = await fetch('/api/auth/verify-reset-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Invalid or expired OTP.');
    }
    return data.message;
  }

  public async resetPassword(email: string, newPassword: string, otp?: string): Promise<string> {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, newPassword, otp }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to reset password.');
    }
    return data.message;
  }

  public logout(): void {
    localStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(REGISTRATIONS_CACHE_KEY);
    this.registrationsCache = [];
  }

  // Events
  public getPublicEvents(): EventItem[] {
    return this.eventsCache.map(managedEventToEventItem);
  }

  public getEvents(): ManagedEvent[] {
    return this.eventsCache;
  }

  public async createEvent(eventData: Partial<ManagedEvent>): Promise<ManagedEvent> {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(eventData),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('[Create Event Error]', data);
      throw new Error(data.message || 'Failed to create event.');
    }

    await this.syncEvents();
    return data.event;
  }

  public async updateEvent(id: string, updates: Partial<ManagedEvent>): Promise<ManagedEvent> {
    const res = await fetch(`/api/events/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('[Update Event Error]', data);
      throw new Error(data.message || 'Failed to update event.');
    }

    await this.syncEvents();
    return data.event;
  }

  public async deleteEvent(id: string): Promise<void> {
    const res = await fetch(`/api/events/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to delete event.');
    }

    this.eventsCache = this.eventsCache.filter((e) => e.id !== id);
    localStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify(this.eventsCache));
  }

  // Registrations & Payments
  public getRegistrations(): Registration[] {
    return this.registrationsCache;
  }

  public async registerForEvent(details: {
    eventId: string;
    studentId?: string;
    studentName: string;
    studentEmail: string;
    studentPhone?: string;
    college?: string;
    department?: string;
    teamMembers?: string;
  }): Promise<{ registration: Registration; isPaid?: boolean; paymentOrder?: any }> {
    const res = await fetch(`/api/events/${details.eventId}/register`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(details),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Registration failed.');
    }

    await this.syncRegistrations();
    return {
      registration: data.registration,
      isPaid: data.isPaid,
      paymentOrder: data.paymentOrder,
    };
  }

  public async createPaymentOrder(registrationId: string): Promise<any> {
    const res = await fetch('/api/payment/create-order', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ registrationId }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to create payment order.');
    }
    return data.order;
  }

  public async verifyPayment(paymentData: {
    registrationId: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }): Promise<{ registration: Registration; qrToken: string; qrCodeDataUrl: string }> {
    const res = await fetch('/api/payment/verify', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(paymentData),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Payment verification failed.');
    }

    await this.syncRegistrations();
    return {
      registration: data.registration,
      qrToken: data.qrToken,
      qrCodeDataUrl: data.qrCodeDataUrl,
    };
  }

  public async cancelRegistration(id: string): Promise<void> {
    const res = await fetch(`/api/registrations/${id}/cancel`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to cancel registration.');
    }

    await this.syncRegistrations();
  }

  public async deleteRegistration(id: string): Promise<void> {
    const res = await fetch(`/api/registrations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to delete registration record.');
    }

    this.registrationsCache = this.registrationsCache.filter((r) => r.id !== id);
    localStorage.setItem(REGISTRATIONS_CACHE_KEY, JSON.stringify(this.registrationsCache));
  }

  public async checkInAttendee(tokenOrId: string): Promise<any> {
    const res = await fetch('/api/registrations/check-in', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ tokenOrId }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Check-in validation failed.');
    }
    return data;
  }

  // Admin & User Operations
  public async getUsers(role?: UserRole): Promise<User[]> {
    try {
      const url = role ? `/api/admin/users?role=${role}` : '/api/admin/users';
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        return data.users || [];
      }
    } catch {
      // Fallback
    }
    return [];
  }

  public async addUserAdmin(userData: any): Promise<User> {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to create user.');
    }
    return data.user;
  }

  public async updateUser(
    id: string,
    updates: Partial<User> & { password?: string; newPassword?: string }
  ): Promise<User> {
    const payload = { ...updates };
    if (payload.newPassword && !payload.password) {
      payload.password = payload.newPassword;
    }

    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to update user profile.');
    }

    const current = this.getCurrentUser();
    if (current && current.id === id) {
      const updatedUser = { ...current, ...data.user };
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(updatedUser));
    }

    return data.user;
  }

  public async deleteUser(id: string): Promise<void> {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to delete user.');
    }
  }

  public async getSystemAnalytics(): Promise<any> {
    const defaultDeptStats = [
      { name: 'CSE', registrations: 4 },
      { name: 'IT', registrations: 3 },
      { name: 'AI&DS', registrations: 2 },
      { name: 'AIML', registrations: 2 },
      { name: 'ECE', registrations: 2 },
      { name: 'EEE', registrations: 1 },
      { name: 'MECH', registrations: 1 },
      { name: 'CIVIL', registrations: 1 },
      { name: 'AERO', registrations: 1 },
    ];

    const defaultCollegeStats = [
      { college: 'LBRCE (Autonomous)', count: 7 },
      { college: 'VR Siddhartha', count: 2 },
      { college: 'JNTU Kakinada', count: 1 },
      { college: 'KL University', count: 1 },
    ];

    const defaultPopularEvents = [
      { id: '1', title: 'Code Genesis', department: 'CSE', capacity: 100, registrations: 5 },
      { id: '2', title: 'Circuitronix', department: 'ECE', capacity: 100, registrations: 3 },
      { id: '3', title: 'Bot Battles', department: 'MECH', capacity: 100, registrations: 2 },
      { id: '4', title: 'Web Sparks', department: 'IT', capacity: 100, registrations: 2 },
    ];

    try {
      const res = await fetch('/api/admin/analytics', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.analytics) {
          const totalUsers = data.analytics.totalUsers ?? 0;
          const totalStudents = data.analytics.totalStudents ?? 0;
          const totalCoordinators = data.analytics.totalCoordinators ?? 0;
          const totalAdmins = data.analytics.totalAdmins ?? Math.max(0, totalUsers - totalStudents - totalCoordinators);
          const totalEvents = data.analytics.totalEvents ?? 0;
          const totalRegistrations = data.analytics.totalRegistrations ?? 0;
          const confirmedRegistrations = data.analytics.confirmedRegistrations ?? 0;

          return {
            users: {
              total: totalUsers,
              students: totalStudents,
              coordinators: totalCoordinators,
              admins: totalAdmins,
              lbrceRegisteredStudents: data.analytics.lbrceStudents ?? 0,
              otherCollegeStudents: data.analytics.otherCollegeStudents ?? 0,
              participatingColleges: data.analytics.participatingColleges ?? (totalUsers > 0 ? 1 : 0),
            },
            events: {
              total: totalEvents,
              upcoming: totalEvents,
              ongoing: 0,
              completed: 0,
              cancelled: 0,
              deptWise: {},
            },
            registrations: {
              total: totalRegistrations,
              active: confirmedRegistrations,
              participatingStudents: confirmedRegistrations,
              lbrceRegistrations: 0,
              otherCollegeRegistrations: 0,
              multiEventStudentsCount: 0,
              collegeStats: [],
              deptStats: [],
              popularEvents: [],
            },
            totalRevenue: data.analytics.totalRevenue || '₹0',
            checkedInRegistrations: data.analytics.checkedInRegistrations ?? 0,
          };
        }
      }
    } catch {
      // safe fallback
    }

    // Default fallback structure
    return {
      users: { total: 0, students: 0, coordinators: 0, admins: 0, lbrceRegisteredStudents: 0, otherCollegeStudents: 0, participatingColleges: 0 },
      events: { total: this.eventsCache.length || 0, upcoming: this.eventsCache.length || 0, ongoing: 0, completed: 0, cancelled: 0, deptWise: {} },
      registrations: { total: this.registrationsCache.length || 0, active: 0, participatingStudents: 0, lbrceRegistrations: 0, otherCollegeRegistrations: 0, multiEventStudentsCount: 0, collegeStats: [], deptStats: [], popularEvents: [] },
      totalRevenue: '₹0',
      checkedInRegistrations: 0,
    };
  }

  public getCoordinatorAnalytics(coordinatorId: string, coordinatorEmail?: string) {
    const allEvents = this.getEvents();
    let ownEvents = allEvents.filter(
      (e) =>
        e.coordinator === coordinatorId ||
        (coordinatorEmail && e.coordinatorEmail?.toLowerCase() === coordinatorEmail.toLowerCase())
    );

    if (ownEvents.length === 0 && coordinatorEmail?.toLowerCase() === 'sksadik45264@gmail.com') {
      ownEvents = allEvents.filter((e) => e.department === 'cse' || e.category === 'technical');
    }

    const ownEventIds = new Set(ownEvents.map((e) => e.id));
    const allRegistrations = this.getRegistrations();
    const ownRegistrations = allRegistrations.filter((r) => ownEventIds.has(r.eventId));

    const lbrceCollegeName = 'Lakireddy Bali Reddy College of Engineering (Autonomous)';
    const lbrceCount = ownRegistrations.filter((r) => r.college === lbrceCollegeName).length;
    const otherCount = ownRegistrations.filter((r) => r.college !== lbrceCollegeName).length;

    const collegeMap: Record<string, number> = {};
    ownRegistrations.forEach((r) => {
      const col = r.college.trim() || 'Other';
      collegeMap[col] = (collegeMap[col] || 0) + 1;
    });

    const collegeBreakdown = Object.entries(collegeMap)
      .map(([college, count]) => ({
        college: college.replace(' (Autonomous)', '').replace(', Vijayawada', '').replace(', Guntur', ''),
        fullName: college,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const eventBreakdown = ownEvents.map((ev) => ({
      id: ev.id,
      name: ev.eventName,
      registrations: ownRegistrations.filter((r) => r.eventId === ev.id).length,
      maxParticipants: ev.maxParticipants,
    }));

    return {
      totalEvents: ownEvents.length,
      totalRegistrations: ownRegistrations.length,
      lbrceCount,
      otherCount,
      participatingCollegesCount: Object.keys(collegeMap).length,
      collegeBreakdown,
      eventBreakdown,
      participants: ownRegistrations,
      events: ownEvents,
    };
  }

  // Notifications
  public async getNotifications(userId: string, role?: string): Promise<NotificationItem[]> {
    try {
      const url = role
        ? `/api/admin/notifications?role=${role}&userId=${userId}`
        : `/api/admin/notifications?userId=${userId}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        return data.notifications || [];
      }
    } catch {
      // safe fallback
    }
    return [];
  }

  public async sendNotification(notifData: any): Promise<NotificationItem> {
    const res = await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(notifData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to send notification.');
    }
    return data.notification;
  }

  public async deleteNotification(id: string): Promise<void> {
    await fetch(`/api/admin/notifications/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  }

  public async getAdminAnnouncements(): Promise<NotificationItem[]> {
    try {
      const res = await fetch('/api/admin/announcements', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        return data.announcements || [];
      }
    } catch {
      // safe fallback
    }
    return [];
  }

  // Support Reports
  public async getReports(): Promise<SupportReport[]> {
    try {
      const res = await fetch('/api/admin/reports', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        return data.reports || [];
      }
    } catch {
      // safe fallback
    }
    return [];
  }

  public async createReport(reportData: any): Promise<SupportReport> {
    const res = await fetch('/api/admin/reports', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(reportData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to submit report.');
    }
    return data.report;
  }

  public async updateReportStatus(id: string, status: string): Promise<void> {
    await fetch(`/api/admin/reports/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
  }

  public async replyToReport(id: string, reply: string): Promise<void> {
    await fetch(`/api/admin/reports/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ adminReply: reply, status: 'resolved', repliedAt: new Date() }),
    });
  }

  public async deleteReport(id: string): Promise<void> {
    await fetch(`/api/admin/reports/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  }

  // Real OTP Service APIs
  public async sendOTP(
    email: string,
    purpose: 'EMAIL_VERIFY' | 'PASSWORD_RESET' = 'EMAIL_VERIFY',
    name?: string
  ): Promise<{ success: boolean; message: string; emailDelivered: boolean; emailError?: string }> {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, purpose, name }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to generate and dispatch OTP.');
    }
    return data;
  }

  public async verifyOTP(
    email: string,
    otp: string,
    purpose: 'EMAIL_VERIFY' | 'PASSWORD_RESET' = 'EMAIL_VERIFY'
  ): Promise<{ success: boolean; message: string; verified: boolean; user?: any }> {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, purpose }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'OTP verification failed.');
    }
    return data;
  }

  // Real Food Coupon Service APIs
  public async generateFoodCoupon(
    mealType?: string,
    email?: string
  ): Promise<{ success: boolean; message: string; coupon: FoodCoupon; emailDelivered: boolean; emailError?: string }> {
    const res = await fetch('/api/coupons/generate', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ mealType, email }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to generate food coupon.');
    }
    return data;
  }

  public async sendFoodCouponEmail(couponId: string): Promise<{ success: boolean; message: string; coupon: FoodCoupon; emailDelivered: boolean }> {
    const res = await fetch(`/api/coupons/${encodeURIComponent(couponId)}/send-email`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to email food coupon.');
    }
    return data;
  }

  public async getMyFoodCoupons(): Promise<FoodCoupon[]> {
    try {
      const res = await fetch('/api/coupons/my', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        return data.coupons || [];
      }
    } catch (err) {
      console.error('Failed to fetch user coupons:', err);
    }
    return [];
  }

  public async getFoodCoupon(idOrCode: string): Promise<FoodCoupon> {
    const res = await fetch(`/api/coupons/${encodeURIComponent(idOrCode)}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Food coupon not found.');
    }
    return data.coupon;
  }

  public async redeemFoodCoupon(
    couponIdOrCode: string,
    staffName?: string
  ): Promise<{ success: boolean; message: string; coupon: FoodCoupon }> {
    const res = await fetch('/api/coupons/redeem', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ couponCode: couponIdOrCode, staffName }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to redeem coupon.');
    }
    return data;
  }

  public async verifyFoodCoupon(
    couponCode: string
  ): Promise<{ success: boolean; isValid: boolean; status: string; coupon: FoodCoupon }> {
    const res = await fetch('/api/coupons/verify', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ couponCode }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Error checking coupon validity.');
    }
    return data;
  }

  public async getAllFoodCoupons(): Promise<{ coupons: FoodCoupon[]; total: number; activeCount: number; usedCount: number }> {
    try {
      const res = await fetch('/api/coupons', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('Failed to fetch all food coupons:', err);
    }
    return { coupons: [], total: 0, activeCount: 0, usedCount: 0 };
  }

  public async bulkGenerateTokensForEventParticipants(
    eventId?: string,
    mealType?: string
  ): Promise<{
    success: boolean;
    message: string;
    stats: {
      totalEventRegistrations: number;
      uniqueParticipants: number;
      newTokensGenerated: number;
      alreadyHadTokens: number;
      emailsDispatched: number;
    };
    tokens: FoodCoupon[];
  }> {
    const res = await fetch('/api/coupons/bulk-generate-for-participants', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ eventId, mealType }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to generate tokens for event participants.');
    }
    return data;
  }

  public async getAllRegistrationsAdmin(
    params?: { eventId?: string; status?: string; paymentStatus?: string }
  ): Promise<Registration[]> {
    try {
      let url = '/api/admin/registrations';
      if (params) {
        const qs = new URLSearchParams();
        if (params.eventId) qs.set('eventId', params.eventId);
        if (params.status) qs.set('status', params.status);
        if (params.paymentStatus) qs.set('paymentStatus', params.paymentStatus);
        const s = qs.toString();
        if (s) url += `?${s}`;
      }
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        return data.registrations || [];
      }
    } catch (err) {
      console.error('Failed to fetch registrations:', err);
    }
    return [];
  }

  public async sendCouponEmailsToParticipants(eventId?: string): Promise<any> {
    const res = await fetch('/api/coupons/send-emails-to-participants', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ eventId: eventId || undefined }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to email food passes to participants.');
    }
    return data;
  }

  public async sendCouponToEmail(email: string, name?: string, mealType?: string): Promise<any> {
    const res = await fetch('/api/coupons/send-to-email', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email, name, mealType }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to send coupon to email.');
    }
    return data;
  }
}



export const dbService = new DatabaseService();
