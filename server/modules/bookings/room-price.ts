import { stayDealPercent, type StoredStayDeals } from '../../../src/shared/utils/roomPricing.js';

/**
 * A unit's price on one date: a season covering the date wins, then the weekend price (Friday and Saturday
 * nights), then the base price. Hotels and homestays price each night, cars each rented day, tours the start date.
 */
export type PricedUnit = {
  basePriceMinor: number;
  weekendPriceMinor?: number | null;
  // The stored shape: a season saved without its dates or price is ignored.
  seasons?: Array<{ from?: string | null; to?: string | null; priceMinor?: number | null }> | null;
  deals?: StoredStayDeals | null;
};

export function nightPriceMinor(unit: PricedUnit, date: string) {
  const season = unit.seasons?.find((item) => item.from && item.to && item.priceMinor != null && item.from <= date && date <= item.to);
  if (season?.priceMinor != null) return season.priceMinor;
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  if ((weekday === 5 || weekday === 6) && unit.weekendPriceMinor != null) return unit.weekendPriceMinor;
  return unit.basePriceMinor;
}

export const nightsPriceMinor = (unit: PricedUnit, nights: string[]) =>
  nights.reduce((total, date) => total + nightPriceMinor(unit, date), 0);

/** A listing's rate plans, as on Booking.com: percents off the standard price. Absent means the plan is off. */
export type RatePlans = { singleGuestPercent?: number | null; nonRefundablePercent?: number | null };
export type RatePlan = 'standard' | 'non_refundable';

/**
 * The room price after the listing's rate plans: the single-guest price when each room has one guest, and the
 * non-refundable price when the guest chose it. Whole rupees, like the deals.
 */
export function ratePlanMinor(subtotalMinor: number, plans: RatePlans | null | undefined, party: { adults: number; children: number; rooms: number }, plan: RatePlan = 'standard') {
  let percent = 0;
  if (plans?.singleGuestPercent && party.adults + party.children <= party.rooms) percent += plans.singleGuestPercent;
  if (plan === 'non_refundable' && plans?.nonRefundablePercent) percent += plans.nonRefundablePercent;
  return percent ? Math.round(subtotalMinor * (100 - percent) / 10_000) * 100 : subtotalMinor;
}

/** What `rooms` rooms cost for these nights after any length-of-stay or early/late deal, in whole rupees. Search cards and the quote both use it. */
export function staySubtotalMinor(room: PricedUnit, nights: string[], rooms: number, today: string) {
  const percent = stayDealPercent(room.deals, nights.length, nights[0], today);
  return Math.round(nightsPriceMinor(room, nights) * (100 - percent) / 10_000) * 100 * rooms;
}
