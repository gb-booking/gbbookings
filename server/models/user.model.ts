import { randomUUID } from 'node:crypto';
import mongoose, { type Model } from 'mongoose';

const { Schema } = mongoose;

export const userRoles = [
  'customer',
  'vendor_owner',
  'vendor_staff',
  'admin',
  'operations_manager',
  'finance_manager',
  'support_agent',
  // Staff whose permissions come from a Super Admin-defined custom role (customRoleId).
  'custom_staff',
] as const;

export type UserRole = typeof userRoles[number];

/** GBBookings employees: they sign in to the console, never to the traveller or partner side. */
export const staffRoles = ['admin', 'operations_manager', 'finance_manager', 'support_agent', 'custom_staff'] as const satisfies readonly UserRole[];
export type StaffRole = typeof staffRoles[number];

const userSchema = new Schema({
  publicId: {
    type: String,
    required: true,
    unique: true,
    immutable: true,
    default: () => `usr_${randomUUID()}`,
  },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  // Google account id ("sub") once the user signs in with Google.
  googleId: { type: String, unique: true, sparse: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  phone: { type: String, trim: true, maxlength: 30 },
  roles: { type: [String], enum: userRoles, default: ['customer'], required: true },
  // For 'custom_staff': the custom role whose permissions this user has.
  customRoleId: { type: Schema.Types.ObjectId, ref: 'CustomRole' },
  // Saved listing public IDs, newest last.
  wishlist: { type: [String], default: [], select: false },
  status: {
    type: String,
    enum: ['active', 'suspended', 'archived'],
    default: 'active',
    index: true,
  },
  emailVerifiedAt: { type: Date, default: null },
  // Passed the email code on the partner sign-in page; needed before starting a partner application or listing.
  partnerVerifiedAt: { type: Date, default: null },
  termsAcceptedAt: { type: Date, default: null },
  policyVersion: { type: String },
  phoneVerifiedAt: { type: Date, default: null },
  twoFactor: {
    enabled: { type: Boolean, default: false },
    channel: { type: String, enum: ['email', 'sms'], default: 'email' },
    enabledAt: { type: Date, default: null },
  },
  passwordChangedAt: { type: Date, default: null },
  failedLoginAttempts: { type: Number, default: 0, min: 0, select: false },
  lockedUntil: { type: Date, default: null, select: false },
  deletedAt: { type: Date, default: null, index: true },
}, { timestamps: true, minimize: true });

userSchema.index({ roles: 1, status: 1 });

export const UserModel: Model<any> = (mongoose.models.User as Model<any> | undefined)
  ?? mongoose.model<any>('User', userSchema);
