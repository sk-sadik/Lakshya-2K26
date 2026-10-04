import mongoose, { Document, Schema } from 'mongoose';

export type CouponStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED';

export interface IFoodCoupon extends Document {
  couponCode: string;
  user: mongoose.Types.ObjectId | null;
  userId: string;
  userName: string;
  userEmail: string;
  college: string;
  department: string;
  // Event linkage: one coupon per (event, participant). A student in 3 events holds 3 coupons.
  eventId?: string;
  eventName?: string;
  // Who issued the pass (admin or the event's coordinator)
  issuedBy?: string;
  issuedByEmail?: string;
  mealType: string;
  mealDescription: string;
  venue: string;
  status: CouponStatus;
  generatedDate: Date;
  expiryDate: Date;
  redeemedAt?: Date;
  redeemedBy?: string;
  qrCodeDataUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FoodCouponSchema = new Schema<IFoodCoupon>(
  {
    couponCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
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
    eventId: {
      type: String,
      trim: true,
      index: true,
    },
    eventName: {
      type: String,
      trim: true,
    },
    issuedBy: {
      type: String,
      trim: true,
    },
    issuedByEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    mealType: {
      type: String,
      default: 'Lakshya Grand Symposium Feast & Refreshment',
      trim: true,
    },
    mealDescription: {
      type: String,
      default: 'Complimentary full-course meal voucher including special lunch combo, dessert, and evening beverage.',
      trim: true,
    },
    venue: {
      type: String,
      default: 'Central Food Court & Dining Arena, LBRCE Campus',
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'USED', 'EXPIRED', 'CANCELLED'],
      default: 'ACTIVE',
      index: true,
    },
    generatedDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: true,
      index: true,
    },
    redeemedAt: {
      type: Date,
      default: null,
    },
    redeemedBy: {
      type: String,
      default: null,
      trim: true,
    },
    qrCodeDataUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// One coupon per (event, participant): a student registered in 3 events holds 3 coupons.
// Partial index so legacy coupons without an eventId never collide with each other.
FoodCouponSchema.index(
  { eventId: 1, userEmail: 1 },
  { unique: true, partialFilterExpression: { eventId: { $exists: true } } }
);

// Virtual for client-safe id
FoodCouponSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

FoodCouponSchema.set('toJSON', {
  virtuals: true,
  transform: function (_doc, ret: Record<string, any>) {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const FoodCoupon = mongoose.model<IFoodCoupon>('FoodCoupon', FoodCouponSchema);
