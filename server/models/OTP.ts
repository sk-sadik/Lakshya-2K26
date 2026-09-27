import mongoose, { Document, Schema } from 'mongoose';

export type OTPPurpose = 'EMAIL_VERIFY' | 'PASSWORD_RESET' | 'CHANGE_PASSWORD';

export interface IOTP extends Document {
  email: string;
  otpHash: string;
  purpose: OTPPurpose;
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
}

const OTPSchema = new Schema<IOTP>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['EMAIL_VERIFY', 'PASSWORD_RESET', 'CHANGE_PASSWORD'],
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index automatically removes expired OTP documents
    },
    attempts: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const OTP = mongoose.model<IOTP>('OTP', OTPSchema);
