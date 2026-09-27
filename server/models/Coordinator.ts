import mongoose, { Document, Schema } from 'mongoose';

export interface ICoordinator extends Document {
  name: string;
  email: string;
  passwordHash: string;
  roles: string[];
  phone?: string;
  college: string;
  department: string;
  facultyId?: string;
  designation?: string;
  status: 'active' | 'disabled';
  isEmailVerified: boolean;
  eventsManaged: mongoose.Types.ObjectId[];
  totalRegistrations: number;
  createdAt: Date;
  updatedAt: Date;
}

const CoordinatorSchema = new Schema<ICoordinator>(
  {
    name: {
      type: String,
      required: [true, 'Coordinator name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
    },
    roles: {
      type: [String],
      enum: ['student', 'coordinator', 'admin'],
      default: ['coordinator'],
      index: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    college: {
      type: String,
      default: 'Lakireddy Bali Reddy College of Engineering (Autonomous)',
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    facultyId: {
      type: String,
      trim: true,
    },
    designation: {
      type: String,
      default: 'Faculty Coordinator',
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'disabled'],
      default: 'active',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    eventsManaged: {
      type: [Schema.Types.ObjectId],
      ref: 'Event',
      default: [],
    },
    totalRegistrations: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for client-safe id
CoordinatorSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

CoordinatorSchema.set('toJSON', {
  virtuals: true,
  transform: function (_doc, ret: Record<string, any>) {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    // Ensure role is included for backward compatibility
    if (ret.roles && Array.isArray(ret.roles)) {
      ret.role = ret.roles[0] || 'coordinator';
    }
    return ret;
  },
});

export const Coordinator = mongoose.model<ICoordinator>('Coordinator', CoordinatorSchema);
