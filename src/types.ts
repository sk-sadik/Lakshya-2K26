export type DepartmentId = 
  | 'all'
  | 'cse'
  | 'it'
  | 'aids'
  | 'aiml'
  | 'ece'
  | 'eee'
  | 'mech'
  | 'civil'
  | 'aero'
  | 'mba';

export type EventCategory = 
  | 'all'
  | 'technical'
  | 'coding'
  | 'robotics'
  | 'gaming'
  | 'paper';

export interface EventItem {
  id: string;
  title: string;
  deptId: DepartmentId;
  category: EventCategory;
  tagline: string;
  description: string;
  prizes: {
    first: string;
    second: string;
    third?: string;
  };
  entryFee: string;
  teamSize: string;
  venue: string;
  timing: string;
  rounds: {
    name: string;
    description: string;
  }[];
  rules: string[];
  coordinators: {
    name: string;
    role: string;
    phone: string;
  }[];
  featured?: boolean;
  accentColor: string;
}

export interface DepartmentInfo {
  id: DepartmentId;
  name: string;
  code: string;
  theme: string;
  description: string;
  iconName: string;
  accentColor: string;
  badge: string;
  totalPrizes: string;
}

export interface ScheduleItem {
  time: string;
  title: string;
  department: string;
  venue: string;
  category: string;
  day?: number;
}

export interface AttendeePass {
  id: string;
  name: string;
  college: string;
  department: string;
  rollNo?: string;
  ticketType: 'Standard Pass' | 'VIP All-Access' | 'Hackathon Delegate' | 'Robotics Lead';
  registeredEvents: string[];
  timestamp: string;
  qrCodeSeed: string;
}

export type UserRole = 'student' | 'coordinator' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  role: UserRole;
  roles: UserRole[];
  college: string;
  department: string;
  phone?: string;
  rollNo?: string;
  facultyId?: string;
  designation?: string;
  managedEventsCount?: number;
  managedEvents?: any[];
  coordinatorRegistrationsCount?: number;
  studentRegistrationsCount?: number;
  status: 'active' | 'disabled';
  isEmailVerified?: boolean;
  createdAt: string;
}

export interface ManagedEvent {
  id: string;
  eventName: string;
  description: string;
  department: DepartmentId;
  category: EventCategory;
  coordinator: string; // coordinator ID or coordinator email
  coordinatorName: string;
  coordinatorEmail?: string;
  date: string;
  time: string;
  venue: string;
  registrationDeadline: string;
  maxParticipants: number;
  registeredCount?: number;
  entryFee: string;
  registrationFee?: string;
  feeAmount?: number;
  isPaid?: boolean;
  teamSize: string;
  prizes: {
    first: string;
    second: string;
    third?: string;
  };
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  approvalStatus: 'approved' | 'pending' | 'rejected';
  createdAt: string;
  rules?: string[];
  rounds?: {
    name: string;
    description: string;
  }[];
}

export interface Registration {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  studentRollNo?: string;
  eventId: string;
  eventName: string;
  college: string;
  department: string;
  teamMembers?: string;
  registrationDate: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  registrationStatus?: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  paymentStatus?: 'FREE' | 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
  paymentOrderId?: string;
  paymentId?: string;
  paymentAmount?: number;
  qrToken?: string;
  qrCodeDataUrl?: string;
  checkedIn?: boolean;
  checkedInAt?: string;
}

export interface NotificationItem {
  id: string;
  userId: string; // 'all' or specific user id or role: 'all' | 'students' | 'coordinators' | 'admins' | specific userId
  targetRole?: 'all' | 'student' | 'coordinator' | 'admin';
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  createdAt: string;
  read: boolean;
  senderName?: string;
  senderRole?: UserRole;
  senderEmail?: string;
}

export interface SupportReport {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderRole: 'student' | 'coordinator';
  senderPhone?: string;
  senderCollege?: string;
  senderDepartment?: string;
  subject: string;
  category: 'issue' | 'query' | 'requisition' | 'feedback' | 'emergency';
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'unread' | 'in_progress' | 'resolved';
  adminReply?: string;
  repliedAt?: string;
  createdAt: string;
}

export interface AuthSession {
  user: Omit<User, 'passwordHash'>;
  token: string;
}

export interface CampusSpot {
  id: string;
  name: string;
  building: string;
  eventsCount: number;
  highlight: string;
  x: number; // percentage
  y: number; // percentage
  icon: string;
}

export type CouponStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED';

export interface FoodCoupon {
  id: string;
  couponCode: string;
  userId: string;
  userName: string;
  userEmail: string;
  college: string;
  department: string;
  mealType: string;
  mealDescription: string;
  venue: string;
  status: CouponStatus;
  generatedDate: string;
  expiryDate: string;
  redeemedAt?: string;
  redeemedBy?: string;
  qrCodeDataUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

