import mongoose, { Document, Schema } from 'mongoose';

export interface ISupportReport extends Document {
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderRole: 'student' | 'coordinator' | 'admin';
  senderPhone?: string;
  senderCollege?: string;
  senderDepartment?: string;
  subject: string;
  category: 'issue' | 'query' | 'requisition' | 'feedback' | 'emergency';
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'unread' | 'in_progress' | 'resolved';
  adminReply?: string;
  repliedAt?: Date;
  createdAt: Date;
}

const SupportReportSchema = new Schema<ISupportReport>(
  {
    senderId: {
      type: String,
      required: true,
      index: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    senderEmail: {
      type: String,
      required: true,
      index: true,
    },
    senderRole: {
      type: String,
      enum: ['student', 'coordinator', 'admin'],
      required: true,
    },
    senderPhone: String,
    senderCollege: String,
    senderDepartment: String,
    subject: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['issue', 'query', 'requisition', 'feedback', 'emergency'],
      default: 'query',
    },
    message: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['unread', 'in_progress', 'resolved'],
      default: 'unread',
    },
    adminReply: String,
    repliedAt: Date,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

SupportReportSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

SupportReportSchema.set('toJSON', {
  virtuals: true,
  transform: function (_doc, ret: Record<string, any>) {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const SupportReport = mongoose.model<ISupportReport>('SupportReport', SupportReportSchema);
