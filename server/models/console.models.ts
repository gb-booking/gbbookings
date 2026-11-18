import { randomUUID } from 'node:crypto';
import mongoose, { type Model } from 'mongoose';

const { Schema } = mongoose;
const model = (name: string, schema: InstanceType<typeof Schema>): Model<any> => (mongoose.models[name] as Model<any> | undefined) ?? mongoose.model<any>(name, schema);

export const paymentRequestTypes = ['remaining_balance', 'booking_advance', 'partial_payment', 'cancellation_fee', 'additional_service'] as const;

/**
 * A partner asking a guest for money on a booking, outside the booking total (an extra service, a fee, a balance).
 * The partner collects it (cash, bank transfer) and marks it paid; GBBookings only records it.
 */
export const PaymentRequestModel = model('PaymentRequest', new Schema({
  publicId: { type: String, required: true, unique: true, immutable: true, default: () => `prq_${randomUUID()}` },
  vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: paymentRequestTypes, required: true },
  amountMinor: { type: Number, required: true, min: 100 },
  dueDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  note: { type: String, trim: true, maxlength: 500 },
  // 'overdue' is not stored: it is a sent request past its due date.
  status: { type: String, enum: ['draft', 'sent', 'paid', 'cancelled'], default: 'draft', index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sentAt: Date, paidAt: Date, cancelledAt: Date,
}, { timestamps: true }));

/** A rule-based risk flag for staff to review. Advice only: nothing is blocked or suspended because of it. */
export const FraudCaseModel = model('FraudCase', new Schema({
  publicId: { type: String, required: true, unique: true, immutable: true, default: () => `frd_${randomUUID()}` },
  // One case per rule and subject, so a rescan updates instead of duplicating.
  key: { type: String, required: true, unique: true },
  rule: { type: String, required: true },
  subject: { type: String, required: true, maxlength: 200 },
  bookingRef: String,
  score: { type: Number, required: true, min: 0, max: 100 },
  reason: { type: String, required: true, maxlength: 500 },
  status: { type: String, enum: ['open', 'under_review', 'cleared', 'confirmed'], default: 'open', index: true },
  history: { type: [new Schema({ at: { type: Date, default: Date.now }, by: String, text: String }, { _id: false })], default: [] },
}, { timestamps: true }));

export const TaskModel = model('Task', new Schema({
  publicId: { type: String, required: true, unique: true, immutable: true, default: () => `tsk_${randomUUID()}` },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  note: { type: String, trim: true, maxlength: 2_000 },
  assigneeId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  dueDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
  status: { type: String, enum: ['open', 'done'], default: 'open', index: true },
  doneAt: Date,
}, { timestamps: true }));

/** A staff role the Super Admin defines from the built-in permissions. Users with role 'custom_staff' point at one. */
export const CustomRoleModel = model('CustomRole', new Schema({
  publicId: { type: String, required: true, unique: true, immutable: true, default: () => `rol_${randomUUID()}` },
  name: { type: String, required: true, trim: true, maxlength: 60, unique: true },
  permissions: { type: [String], default: [] },
  status: { type: String, enum: ['active', 'disabled'], default: 'active' },
}, { timestamps: true }));

/** An AI feature the Super Admin turned off in the AI control center. Features are on unless listed here. */
export const AiFeatureModel = model('AiFeature', new Schema({
  feature: { type: String, required: true, unique: true },
  enabled: { type: Boolean, required: true },
}, { timestamps: true }));

/** One AI call, for the AI control center's usage and error figures. */
export const AiUsageModel = model('AiUsage', new Schema({
  feature: { type: String, required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  tokens: { type: Number, default: 0 },
  ok: { type: Boolean, required: true },
  at: { type: Date, default: Date.now, index: true },
}));
