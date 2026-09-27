import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  userId: string; // 'all' or specific userId or role
  targetRole?: 'all' | 'student' | 'coordinator' | 'admin';
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  read: boolean;
  senderName?: string;
  senderRole?: 'student' | 'coordinator' | 'admin';
  senderEmail?: string;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: String,
      default: 'all',
      index: true,
    },
    targetRole: {
      type: String,
      enum: ['all', 'student', 'coordinator', 'admin'],
      default: 'all',
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'alert'],
      default: 'info',
    },
    read: {
      type: Boolean,
      default: false,
    },
    senderName: String,
    senderRole: {
      type: String,
      enum: ['student', 'coordinator', 'admin'],
    },
    senderEmail: String,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

NotificationSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

NotificationSchema.set('toJSON', {
  virtuals: true,
  transform: function (_doc, ret: Record<string, any>) {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
