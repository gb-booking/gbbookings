import { percentOfMinor } from '../settings/settings.service.js';

/**
 * A fee the partner adds, a tax the admin sets, or GBBookings' service fee paid by the guest.
 * `rate` is a percent, or paisa for an 'amount' fee.
 */
export type ChargeRule = { name: string; type: 'fee' | 'tax' | 'service'; kind: 'percent' | 'amount'; rate: number };
export type ChargeLine = ChargeRule & { amountMinor: number };

const line = (rule: ChargeRule, amountMinor: number): ChargeLine => ({ name: rule.name, type: rule.type, kind: rule.kind, rate: rule.rate, amountMinor });

/** Partner fees are worked out on the discounted price; the service fee and taxes on that price plus the fees. Taxes are not charged on the service fee. */
export function applyCharges(baseMinor: number, rules: ChargeRule[]) {
  const fees = rules.filter((rule) => rule.type === 'fee').map((rule) => line(rule, rule.kind === 'amount' ? rule.rate : percentOfMinor(baseMinor, rule.rate)));
  const feesMinor = fees.reduce((total, item) => total + item.amountMinor, 0);
  const service = rules.filter((rule) => rule.type === 'service').map((rule) => line(rule, percentOfMinor(baseMinor + feesMinor, rule.rate)));
  const serviceMinor = service.reduce((total, item) => total + item.amountMinor, 0);
  const taxes = rules.filter((rule) => rule.type === 'tax').map((rule) => line(rule, percentOfMinor(baseMinor + feesMinor, rule.rate)));
  const taxesMinor = taxes.reduce((total, item) => total + item.amountMinor, 0);
  return { lines: [...fees, ...service, ...taxes], feesMinor, serviceMinor, taxesMinor, totalMinor: baseMinor + feesMinor + serviceMinor + taxesMinor };
}

/** The charges a new booking on this listing pays. */
export function chargeRulesFor(
  listing: { fees?: Array<{ name?: string | null; kind?: string | null; value?: number | null }> | null },
  settings: { taxes: Array<{ name: string; percent: number }>; serviceFeePercent: number },
): ChargeRule[] {
  return [
    ...(listing.fees ?? []).map((fee) => ({ name: fee.name ?? 'Fee', type: 'fee' as const, kind: fee.kind === 'amount' ? 'amount' as const : 'percent' as const, rate: fee.kind === 'amount' ? (fee.value ?? 0) * 100 : fee.value ?? 0 })),
    ...(settings.serviceFeePercent > 0 ? [{ name: 'GBBookings service fee', type: 'service' as const, kind: 'percent' as const, rate: settings.serviceFeePercent }] : []),
    ...settings.taxes.map((tax) => ({ name: tax.name, type: 'tax' as const, kind: 'percent' as const, rate: tax.percent })),
  ];
}

/**
 * GBBookings' take on the money the partner keeps: the commission percent on the price (taxes pass through to the
 * government and the service fee is already GBBookings'), plus the service fee itself. Both shrink with a refund.
 */
export function commissionOn(pricing: { totalMinor: number; taxesMinor?: number; serviceMinor?: number; commissionPercent?: number }, keptMinor = pricing.totalMinor) {
  if (pricing.totalMinor <= 0) return 0;
  const share = keptMinor / pricing.totalMinor;
  const serviceMinor = pricing.serviceMinor ?? 0;
  const commissionable = share * (pricing.totalMinor - (pricing.taxesMinor ?? 0) - serviceMinor);
  return percentOfMinor(commissionable, pricing.commissionPercent ?? 0) + Math.round(share * serviceMinor);
}
