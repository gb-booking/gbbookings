import { z } from 'zod';
import { connectDatabase } from '../../database/connection.js';
import { PlatformSettingModel } from '../../models/platform-setting.model.js';
import { ServiceUnavailableError } from '../../shared/app-error.js';
import { recordAuditEvent } from '../audit/audit.service.js';
import type { SessionMetadata } from '../auth/auth.service.js';

/** Used until the admin saves settings once. The refund tiers are starting values for the admin to change. */
export const DEFAULT_SETTINGS = {
  // GBBookings' commission per listing type, in percent of the price excluding taxes and the service fee.
  commissionPercents: { hotel: 12, homestay: 12, tour: 10, car: 8 },
  // Paid by the guest on top of the price, shown as its own line at checkout.
  serviceFeePercent: 2,
  refundTiers: [{ withinHours: 24, refundPercent: 100 }, { withinHours: 48, refundPercent: 75 }],
  laterRefundPercent: 50,
  taxes: [] as Array<{ name: string; percent: number }>,
};
export type PlatformSettings = typeof DEFAULT_SETTINGS;
export type ListingKind = keyof PlatformSettings['commissionPercents'];

const percent = z.number().min(0).max(100).multipleOf(0.01);
export const platformSettingsSchema = z.object({
  commissionPercents: z.object({ hotel: percent.max(50), homestay: percent.max(50), tour: percent.max(50), car: percent.max(50) }).strict(),
  serviceFeePercent: percent.max(20),
  refundTiers: z.array(z.object({ withinHours: z.number().int().min(1).max(8_760), refundPercent: percent }).strict()).max(10)
    .refine((tiers) => tiers.every((tier, index) => index === 0 || tiers[index - 1].withinHours < tier.withinHours),
      { message: 'List the time limits from shortest to longest, each one longer than the last.' }),
  laterRefundPercent: percent,
  taxes: z.array(z.object({ name: z.string().trim().min(2).max(60), percent: percent.max(50) }).strict()).max(5).default([]),
}).strict();

export async function requireSettingsDatabase() {
  if (!await connectDatabase()) throw new ServiceUnavailableError('Platform settings are unavailable while the database is disconnected.');
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const saved = await PlatformSettingModel.findOne({ key: 'platform' }).lean() as any;
  if (!saved) return DEFAULT_SETTINGS;
  // Preserve the agreed rate and absence of a guest fee on legacy settings.
  const rates = saved.commissionPercents ?? {};
  const legacyRate = saved.commissionPercent;
  const legacySettings = !saved.commissionPercents && typeof legacyRate === 'number';
  return {
    commissionPercents: {
      hotel: rates.hotel ?? legacyRate ?? DEFAULT_SETTINGS.commissionPercents.hotel, homestay: rates.homestay ?? legacyRate ?? DEFAULT_SETTINGS.commissionPercents.homestay,
      tour: rates.tour ?? legacyRate ?? DEFAULT_SETTINGS.commissionPercents.tour, car: rates.car ?? legacyRate ?? DEFAULT_SETTINGS.commissionPercents.car,
    },
    serviceFeePercent: saved.serviceFeePercent ?? (legacySettings ? 0 : DEFAULT_SETTINGS.serviceFeePercent),
    refundTiers: (saved.refundTiers ?? []).map(({ withinHours, refundPercent }: any) => ({ withinHours, refundPercent })),
    laterRefundPercent: saved.laterRefundPercent,
    taxes: (saved.taxes ?? []).map(({ name, percent }: any) => ({ name, percent })),
  };
}

export async function updatePlatformSettings(userId: string, input: PlatformSettings, metadata: SessionMetadata) {
  const before = await getPlatformSettings();
  await PlatformSettingModel.updateOne({ key: 'platform' }, { $set: { ...input, updatedBy: userId } }, { upsert: true, runValidators: true });
  await recordAuditEvent({
    actorId: userId, actorType: 'user', action: 'platform.settings_updated', resourceType: 'platform_settings', resourceId: 'platform',
    ...metadata, metadata: { before, after: input },
  });
  return getPlatformSettings();
}

/** Refund percent for a guest cancelling a paid booking `hoursSinceBooking` after making it. */
export function guestRefundPercent(settings: Pick<PlatformSettings, 'refundTiers' | 'laterRefundPercent'>, hoursSinceBooking: number) {
  return settings.refundTiers.find((tier) => hoursSinceBooking <= tier.withinHours)?.refundPercent ?? settings.laterRefundPercent;
}

/** A percent of an amount in minor units, rounded to the nearest minor unit. */
export const percentOfMinor = (amountMinor: number, percentValue: number) => Math.round((amountMinor * percentValue) / 100);
