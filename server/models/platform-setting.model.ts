import mongoose, { type Model } from 'mongoose';

const { Schema } = mongoose;

// One document (key "platform") holding the admin-set money rules. See modules/settings/settings.service.ts.
const platformSettingSchema = new Schema({
  key: { type: String, required: true, unique: true, immutable: true },
  // Old single rate, kept so documents saved before per-type rates still load.
  commissionPercent: { type: Number, min: 0, max: 50 },
  // GBBookings' cut per listing type, in percent.
  commissionPercents: {
    type: new Schema({ hotel: { type: Number, min: 0, max: 50 }, homestay: { type: Number, min: 0, max: 50 }, tour: { type: Number, min: 0, max: 50 }, car: { type: Number, min: 0, max: 50 } }, { _id: false }),
    default: undefined,
  },
  // Paid by the guest on every booking, kept by GBBookings.
  serviceFeePercent: { type: Number, min: 0, max: 20 },
  // Bookings made before per-listing cancellation policies: the refund for cancelling within N hours of booking, first match wins.
  refundTiers: {
    type: [new Schema({ withinHours: { type: Number, min: 1 }, refundPercent: { type: Number, min: 0, max: 100 } }, { _id: false })],
    default: [],
  },
  // Refund for cancelling later than every tier.
  laterRefundPercent: { type: Number, required: true, min: 0, max: 100 },
  // Taxes added to every booking, shown as their own lines. Partners keep and remit them; no commission applies.
  taxes: { type: [new Schema({ name: { type: String, trim: true, maxlength: 60 }, percent: { type: Number, min: 0, max: 50 } }, { _id: false })], default: [] },
  // Platform identity and locale, edited on the Super Admin's Platform settings and Language & currency pages.
  websiteName: { type: String, trim: true, maxlength: 80 },
  supportEmail: { type: String, trim: true, lowercase: true, maxlength: 120 },
  supportPhone: { type: String, trim: true, maxlength: 30 },
  defaultCurrency: { type: String, trim: true, uppercase: true, maxlength: 3 },
  timezone: { type: String, trim: true, maxlength: 60 },
  defaultLanguage: { type: String, trim: true, maxlength: 10 },
  languages: { type: [new Schema({ code: { type: String, trim: true, maxlength: 10 }, name: { type: String, trim: true, maxlength: 60 }, enabled: { type: Boolean, default: true } }, { _id: false })], default: [] },
  supportedCurrencies: { type: [new Schema({ code: { type: String, trim: true, uppercase: true, maxlength: 3 }, name: { type: String, trim: true, maxlength: 60 } }, { _id: false })], default: [] },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export const PlatformSettingModel: Model<any> = (mongoose.models.PlatformSetting as Model<any> | undefined)
  ?? mongoose.model<any>('PlatformSetting', platformSettingSchema);
