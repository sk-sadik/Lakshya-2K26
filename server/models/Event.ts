import mongoose, { Document, Schema } from 'mongoose';

export interface IEventPrize {
  first: string;
  second: string;
  third?: string;
}

export interface IEventRound {
  name: string;
  description: string;
}

export interface IEventCoordinator {
  name: string;
  role: string;
  phone: string;
}

export interface IEvent extends Document {
  title: string;
  eventName: string;
  description: string;
  department: string;
  category: string;
  coordinator?: mongoose.Types.ObjectId;
  coordinatorName: string;
  coordinatorEmail?: string;
  date: string;
  time: string;
  venue: string;
  registrationDeadline: string;
  entryFee: string;
  registrationFee: string;
  feeAmount: number;
  isPaid: boolean;
  maxParticipants: number;
  registeredCount: number;
  teamSize: string;
  prizes: IEventPrize;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  approvalStatus: 'approved' | 'pending' | 'rejected';
  rules: string[];
  rounds: IEventRound[];
  coordinators: IEventCoordinator[];
  accentColor?: string;
  featured?: boolean;
  customId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    customId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    eventName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    department: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      default: 'technical',
      index: true,
    },
    coordinator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    coordinatorName: {
      type: String,
      default: 'Faculty Coordinator',
    },
    coordinatorEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    date: {
      type: String,
      default: 'Feb 20-21, 2026',
    },
    time: {
      type: String,
      default: '10:00 AM - 01:00 PM',
    },
    venue: {
      type: String,
      default: 'LBRCE Campus',
    },
    registrationDeadline: {
      type: String,
      default: '2026-12-31T23:59:59Z',
    },
    entryFee: {
      type: String,
      default: 'Free',
    },
    registrationFee: {
      type: String,
      default: 'Free',
    },
    feeAmount: {
      type: Number,
      default: 0,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    maxParticipants: {
      type: Number,
      default: 100,
    },
    registeredCount: {
      type: Number,
      default: 0,
    },
    teamSize: {
      type: String,
      default: '1-3 Members',
    },
    prizes: {
      first: { type: String, default: '₹10,000' },
      second: { type: String, default: '₹5,000' },
      third: { type: String, default: '₹2,500' },
    },
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
      default: 'upcoming',
      index: true,
    },
    approvalStatus: {
      type: String,
      enum: ['approved', 'pending', 'rejected'],
      default: 'approved',
    },
    rules: {
      type: [String],
      default: [
        'Valid student college ID is mandatory for campus entry.',
        'Decisions made by the faculty coordinators and jury are final.',
        'Adherence to the schedule and code of conduct is strictly required.',
      ],
    },
    rounds: {
      type: [
        {
          name: String,
          description: String,
        },
      ],
      default: [
        { name: 'Round 1: Preliminary Evaluation', description: 'Core problem statement and qualification round.' },
        { name: 'Round 2: Grand Finals & Presentation', description: 'Working demonstration and jury defense.' },
      ],
    },
    coordinators: {
      type: [
        {
          name: String,
          role: String,
          phone: String,
        },
      ],
      default: [],
    },
    accentColor: {
      type: String,
      default: '#ec4899',
    },
    featured: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

EventSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

EventSchema.set('toJSON', {
  virtuals: true,
  transform: function (_doc, ret: Record<string, any>) {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Event = mongoose.model<IEvent>('Event', EventSchema);
