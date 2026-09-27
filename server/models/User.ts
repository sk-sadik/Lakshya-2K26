import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'student' | 'coordinator' | 'admin';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role?: UserRole;
  roles: UserRole[];
  phone?: string;
  college: string;
  department: string;
  rollNo?: string;
  facultyId?: string;
  designation?: string;
  eventsManaged?: mongoose.Types.ObjectId[];
  status: 'active' | 'disabled';
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
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
      select: false, // Never return password hash in regular queries
    },
    role: {
      type: String,
      enum: ['student', 'coordinator', 'admin'],
      trim: true,
    },
    roles: {
      type: [String],
      enum: ['student', 'coordinator', 'admin'],
      default: function(this: any) {
        return this.role ? [this.role] : ['student'];
      },
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
      default: 'cse',
      trim: true,
    },
    rollNo: {
      type: String,
      trim: true,
    },
    facultyId: {
      type: String,
      trim: true,
    },
    designation: {
      type: String,
      trim: true,
    },
    eventsManaged: {
      type: [Schema.Types.ObjectId],
      ref: 'Event',
      default: [],
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
  },
  {
    timestamps: true,
  }
);

// Virtual for client-safe id
UserSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

UserSchema.set('toJSON', {
  virtuals: true,
  transform: function (_doc, ret: Record<string, any>) {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    // Ensure roles array is preserved
    if (!ret.roles || !Array.isArray(ret.roles) || ret.roles.length === 0) {
      ret.roles = ret.role ? [ret.role] : ['student'];
    }
    // Ensure primary role is set for backward compatibility
    if (!ret.role) {
      ret.role = ret.roles[0] || 'student';
    }
    return ret;
  },
});

export const User = mongoose.model<IUser>('User', UserSchema);
