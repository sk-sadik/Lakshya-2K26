import mongoose, { Document, Schema } from 'mongoose';

export type PaymentStatus = 'FREE' | 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
export type RegistrationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface IRegistration extends Document {
  student: mongoose.Types.ObjectId;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  studentRollNo?: string;
  event: mongoose.Types.ObjectId;
  eventId: string;
  eventName: string;
  college: string;
  department: string;
  teamMembers?: string;
  paymentOrderId?: string;
  paymentId?: string;
  paymentSignature?: string;
  paymentAmount: number;
  paymentStatus: PaymentStatus;
  registrationStatus: RegistrationStatus;
  qrToken?: string;
  qrCodeDataUrl?: string;
  checkedIn: boolean;
  checkedInAt?: Date;
  registrationDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RegistrationSchema = new Schema<IRegistration>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    studentId: {
      type: String,
      required: true,
      index: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    studentEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    studentPhone: {
      type: String,
      trim: true,
    },
    studentRollNo: {
      type: String,
      trim: true,
      uppercase: true,
    },
    event: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    eventId: {
      type: String,
      required: true,
      index: true,
    },
    eventName: {
      type: String,
      required: true,
    },
    college: {
      type: String,
      default: 'Lakireddy Bali Reddy College of Engineering (Autonomous)',
    },
    department: {
      type: String,
      default: 'cse',
    },
    teamMembers: {
      type: String,
    },
    paymentOrderId: {
      type: String,
      sparse: true,
      index: true,
    },
    paymentId: {
      type: String,
      sparse: true,
      index: true,
    },
    paymentSignature: {
      type: String,
    },
    paymentAmount: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['FREE', 'PENDING', 'PAID', 'FAILED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    registrationStatus: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    qrToken: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    qrCodeDataUrl: {
      type: String,
    },
    checkedIn: {
      type: Boolean,
      default: false,
      index: true,
    },
    checkedInAt: {
      type: Date,
    },
    registrationDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate active registrations for the same user on the same event
RegistrationSchema.index(
  { student: 1, event: 1 },
  {
    unique: true,
    partialFilterExpression: { registrationStatus: { $in: ['CONFIRMED', 'PENDING'] } },
  }
);

RegistrationSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Alias status for frontend compatibility
RegistrationSchema.virtual('status').get(function () {
  return this.registrationStatus.toLowerCase();
});

RegistrationSchema.set('toJSON', {
  virtuals: true,
  transform: function (_doc, ret: Record<string, any>) {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    ret.status = (ret.registrationStatus || 'confirmed').toLowerCase();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Registration = mongoose.model<IRegistration>('Registration', RegistrationSchema);
