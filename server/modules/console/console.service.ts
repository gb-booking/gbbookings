import mongoose from 'mongoose';
import { connectDatabase } from '../../database/connection.js';
import { BookingModel } from '../../models/booking.model.js';
import { ConversationModel } from '../../models/conversation.model.js';
import { FraudCaseModel, PaymentRequestModel, TaskModel } from '../../models/console.models.js';
import { ListingModel } from '../../models/listing.model.js';
import { PayoutModel } from '../../models/payout.model.js';
import { ReviewModel } from '../../models/review.model.js';
import { SupportCaseModel } from '../../models/support-case.model.js';
import { UserModel } from '../../models/user.model.js';
import { VendorModel } from '../../models/vendor.model.js';
import { ServiceUnavailableError } from '../../shared/app-error.js';
import { escapeRegex } from '../../shared/escape-regex.js';
import { hasPermission, type PermissionKey } from '../auth/rbac.js';
import { todayInPakistan } from '../bookings/stay-dates.js';

export async function requireDatabase() {
  if (!await connectDatabase()) throw new ServiceUnavailableError('This page is unavailable while the database is disconnected.');
}

const major = (minor: number) => Math.round(minor) / 100;
const PRODUCTS = ['hotel', 'homestay', 'car', 'tour'] as const;
const refundTotal = (booking: any) => (booking.refunds ?? []).reduce((total: number, refund: any) => total + refund.amountMinor, 0);
const earnsCommission = (booking: any) => booking.paymentStatus === 'paid' && ['confirmed', 'completed', 'cancelled', 'no_show'].includes(booking.status);
const retainedServiceMinor = (booking: any) => {
  if (!earnsCommission(booking) || booking.pricing.totalMinor <= 0) return 0;
  const returned = (booking.refunds ?? []).filter((refund: any) => ['cancellation', 'late_payment'].includes(refund.kind))
    .reduce((total: number, refund: any) => total + refund.amountMinor, 0);
  return Math.round((booking.pricing.serviceMinor ?? 0) * Math.max(0, 1 - returned / booking.pricing.totalMinor));
};

/**
 * Platform reports for stays starting between `from` and `to` (Pakistan dates), one figure set per report card.
 * ponytail: loads the range's bookings into memory; move to $group pipelines past ~50k bookings a range.
 */
export async function platformReport(from: string, to: string) {
  await requireDatabase();
  const bookings = await BookingModel.find({ checkIn: { $gte: from, $lte: to } })
    .select('status paymentStatus paymentMethod nights rooms pricing.totalMinor pricing.commissionMinor pricing.serviceMinor refunds listingSnapshot.type listingSnapshot.location').lean() as any[];
  const payouts = await PayoutModel.find({ status: 'settled', settledAt: { $gte: new Date(`${from}T00:00:00+05:00`), $lte: new Date(`${to}T23:59:59+05:00`) } }).select('netMinor commissionMinor').lean() as any[];

  const byProduct = PRODUCTS.map((type) => {
    const rows = bookings.filter((booking) => booking.listingSnapshot?.type === type);
    const kept = rows.filter((booking) => ['confirmed', 'completed'].includes(booking.status));
    return {
      type,
      bookings: rows.length,
      cancelled: rows.filter((booking) => booking.status === 'cancelled').length,
      noShows: rows.filter((booking) => booking.status === 'no_show').length,
      revenue: major(kept.reduce((total, booking) => total + booking.pricing.totalMinor, 0)),
      commission: major(rows.filter(earnsCommission).reduce((total, booking) => total + (booking.pricing.commissionMinor ?? 0), 0)),
      refunds: major(rows.reduce((total, booking) => total + refundTotal(booking), 0)),
      unitsSold: kept.reduce((total, booking) => total + booking.nights * booking.rooms, 0),
    };
  });
  const destinations = new Map<string, { bookings: number; revenue: number }>();
  for (const booking of bookings) {
    const place = (booking.listingSnapshot?.location ?? 'Unknown').split(',').at(-1)!.trim() || 'Unknown';
    const row = destinations.get(place) ?? { bookings: 0, revenue: 0 };
    row.bookings += 1;
    if (['confirmed', 'completed'].includes(booking.status)) row.revenue += booking.pricing.totalMinor;
    destinations.set(place, row);
  }
  const refunds = bookings.flatMap((booking) => booking.refunds ?? []);
  return {
    from, to,
    totals: {
      bookings: bookings.length,
      revenue: byProduct.reduce((total, row) => total + row.revenue, 0),
      commission: byProduct.reduce((total, row) => total + row.commission, 0),
      serviceFees: major(bookings.reduce((total, booking) => total + retainedServiceMinor(booking), 0)),
      cancelled: byProduct.reduce((total, row) => total + row.cancelled, 0),
      paidOnline: bookings.filter((booking) => booking.paymentMethod === 'online' && booking.paymentStatus === 'paid').length,
    },
    byProduct,
    refunds: {
      count: refunds.length,
      sent: major(refunds.filter((refund) => refund.status === 'sent').reduce((total, refund) => total + refund.amountMinor, 0)),
      waiting: major(refunds.filter((refund) => refund.status !== 'sent').reduce((total, refund) => total + refund.amountMinor, 0)),
    },
    payouts: {
      settled: payouts.length,
      paidToPartners: major(payouts.filter((payout) => payout.netMinor > 0).reduce((total, payout) => total + payout.netMinor, 0)),
      receivedFromPartners: major(-payouts.filter((payout) => payout.netMinor < 0).reduce((total, payout) => total + payout.netMinor, 0)),
    },
    destinations: [...destinations.entries()].map(([place, row]) => ({ place, bookings: row.bookings, revenue: major(row.revenue) }))
      .sort((a, b) => b.bookings - a.bookings).slice(0, 15),
  };
}

const tierFor = (lifetimeMinor: number) => lifetimeMinor >= 50_000_000 ? 'Gold' : lifetimeMinor >= 15_000_000 ? 'Silver' : 'Bronze';
/** One point per PKR 100 spent on completed trips. */
const pointsFor = (lifetimeMinor: number) => Math.floor(lifetimeMinor / 10_000);
export const referralCode = (publicId: string) => `GB${publicId.replace(/[^0-9a-f]/gi, '').slice(-6).toUpperCase()}`;

/** Guests with their value to the platform, from completed trips. Loyalty points and tiers are worked out from the same figures. */
export async function customerRecords(query: { search?: string; page: number; limit: number }) {
  await requireDatabase();
  const filter: Record<string, unknown> = { roles: 'customer', deletedAt: null };
  if (query.search) { const pattern = new RegExp(escapeRegex(query.search), 'i'); filter.$or = [{ email: pattern }, { name: pattern }]; }
  const [users, total] = await Promise.all([
    UserModel.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).select('publicId name email phone status createdAt').lean() as Promise<any[]>,
    UserModel.countDocuments(filter),
  ]);
  const stats = await BookingModel.aggregate([
    { $match: { customerId: { $in: users.map((user) => user._id) } } },
    { $group: {
      _id: '$customerId', bookings: { $sum: 1 },
      completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
      lifetimeMinor: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$pricing.totalMinor', 0] } },
      withChildren: { $max: { $cond: [{ $gt: ['$children', 0] }, 1, 0] } },
      lastStay: { $max: '$checkIn' },
    } },
  ]);
  const byUser = new Map(stats.map((row) => [String(row._id), row]));
  return {
    data: users.map((user) => {
      const row = byUser.get(String(user._id)) ?? { bookings: 0, completed: 0, lifetimeMinor: 0, withChildren: 0 };
      const tier = tierFor(row.lifetimeMinor);
      const tags = [row.completed >= 2 ? 'Repeat' : row.completed === 1 ? 'First-time' : 'No trips yet', ...(row.withChildren ? ['Family'] : [])];
      return {
        id: user.publicId, name: user.name, email: user.email, phone: user.phone, status: user.status, joined: user.createdAt,
        bookings: row.bookings, completed: row.completed, lifetimeValue: major(row.lifetimeMinor), lastStay: row.lastStay,
        tier, vip: tier === 'Gold', tags, points: pointsFor(row.lifetimeMinor), referralCode: referralCode(user.publicId),
      };
    }),
    pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
  };
}

/** The signed-in guest's own loyalty figures. */
export async function myLoyalty(userId: string) {
  await requireDatabase();
  const [user, [row]] = await Promise.all([
    UserModel.findById(userId).select('publicId').lean() as Promise<any>,
    BookingModel.aggregate([{ $match: { customerId: new mongoose.Types.ObjectId(userId), status: 'completed' } }, { $group: { _id: null, trips: { $sum: 1 }, lifetimeMinor: { $sum: '$pricing.totalMinor' } } }]),
  ]);
  const lifetimeMinor = row?.lifetimeMinor ?? 0;
  const tier = tierFor(lifetimeMinor);
  const next = tier === 'Bronze' ? { tier: 'Silver', atMinor: 15_000_000 } : tier === 'Silver' ? { tier: 'Gold', atMinor: 50_000_000 } : null;
  return {
    points: pointsFor(lifetimeMinor), tier, trips: row?.trips ?? 0, lifetimeValue: major(lifetimeMinor), referralCode: referralCode(user.publicId),
    ...(next ? { nextTier: next.tier, toNextTier: major(next.atMinor - lifetimeMinor) } : {}),
  };
}

/** Things waiting for staff, limited to what this staff member may act on. */
export async function staffNotifications(auth: { userId: string; roles: any[]; extraPermissions?: string[] }) {
  await requireDatabase();
  const can = (permission: PermissionKey) => hasPermission(auth.roles, permission, auth.extraPermissions);
  const today = todayInPakistan();
  const checks: Array<[PermissionKey, string, string, () => Promise<number>]> = [
    ['support:manage', 'support', 'Guests waiting for an answer', () => SupportCaseModel.countDocuments({ status: 'open' })],
    ['support:manage', 'support', 'Reported chats to read', () => ConversationModel.countDocuments({ 'report.status': 'open' })],
    ['vendor:manage', 'inbox', 'Partner applications to review', () => VendorModel.countDocuments({ status: 'submitted', deletedAt: null })],
    ['vendor:manage', 'inbox', 'Business detail changes to approve', () => VendorModel.countDocuments({ pendingChanges: { $exists: true } })],
    ['listing:moderate', 'inbox', 'Listings waiting to go live', () => ListingModel.countDocuments({ status: 'submitted', deletedAt: null })],
    ['listing:moderate', 'reviews', 'Reviews reported by partners', () => ReviewModel.countDocuments({ 'report.at': { $ne: null } })],
    ['booking:manage', 'bookings', 'No-show disputes to decide', () => BookingModel.countDocuments({ 'noShow.dispute.status': 'open' })],
    ['finance:manage', 'refunds', 'Refunds still to send', () => BookingModel.countDocuments({ refunds: { $elemMatch: { status: { $ne: 'sent' } } } })],
    ['finance:manage', 'payouts', 'Partner statements not settled', () => PayoutModel.countDocuments({ status: 'open' })],
    ['booking:read', 'payment-requests', 'Partner payment requests overdue', () => PaymentRequestModel.countDocuments({ status: 'sent', dueDate: { $lt: today } })],
    ['fraud:review', 'fraud', 'Fraud cases to review', () => FraudCaseModel.countDocuments({ status: { $in: ['open', 'under_review'] } })],
  ];
  const allowed = checks.filter(([permission]) => can(permission));
  const counts = await Promise.all(allowed.map(([, , , count]) => count()));
  const tasks = await TaskModel.countDocuments({ assigneeId: auth.userId, status: 'open' });
  return [
    ...allowed.map(([, page, text], index) => ({ page, text, count: counts[index] })),
    { page: 'tasks', text: 'Your open tasks', count: tasks },
  ].filter((item) => item.count > 0);
}

/**
 * Rule-based fraud scan over the last 30 days. Each hit is a case for a person to review; nothing is blocked.
 * Rescanning updates a case's score and reason but keeps its status and history.
 */
export async function runFraudScan(actor: string) {
  await requireDatabase();
  const since = new Date(Date.now() - 30 * 86_400_000);
  const hits: Array<{ key: string; rule: string; subject: string; bookingRef?: string; score: number; reason: string }> = [];
  const recent = await BookingModel.find({ createdAt: { $gte: since } }).select('reference customerId guest createdAt checkIn checkOut status paymentStatus paidAt statusHistory listingSnapshot.title').sort({ createdAt: 1 }).lean() as any[];

  const byCustomer = new Map<string, any[]>();
  for (const booking of recent) byCustomer.set(String(booking.customerId), [...(byCustomer.get(String(booking.customerId)) ?? []), booking]);
  for (const [customerId, list] of byCustomer) {
    // Many bookings in a short burst.
    for (let index = 0; index + 2 < list.length; index += 1) {
      const span = new Date(list[index + 2].createdAt).getTime() - new Date(list[index].createdAt).getTime();
      if (span <= 10 * 60_000) {
        hits.push({ key: `burst:${customerId}`, rule: 'Booking frequency', subject: list[index].guest.name, bookingRef: list[index + 2].reference, score: 82, reason: `${list.length} bookings in 30 days, 3 of them within 10 minutes.` });
        break;
      }
    }
    // The same guest in two places on the same nights.
    const live = list.filter((booking) => ['pending', 'confirmed'].includes(booking.status));
    for (let a = 0; a < live.length; a += 1) for (let b = a + 1; b < live.length; b += 1) {
      if (live[a].checkIn < live[b].checkOut && live[b].checkIn < live[a].checkOut) {
        hits.push({ key: `overlap:${live[a].reference}:${live[b].reference}`, rule: 'Overlapping bookings', subject: live[a].guest.name, bookingRef: live[b].reference, score: 31, reason: `${live[a].reference} and ${live[b].reference} cover the same nights at different places.` });
      }
    }
  }
  // Paid, then cancelled within two hours: a common card-testing and refund pattern.
  for (const booking of recent.filter((item) => item.status === 'cancelled' && item.paidAt)) {
    const cancelled = (booking.statusHistory ?? []).find((event: any) => event.status === 'cancelled');
    if (cancelled && new Date(cancelled.at).getTime() - new Date(booking.paidAt).getTime() <= 2 * 3_600_000) {
      hits.push({ key: `quick-refund:${booking.reference}`, rule: 'Refund soon after payment', subject: booking.guest.name, bookingRef: booking.reference, score: 58, reason: 'Paid online, then cancelled for a refund within two hours.' });
    }
  }
  // Bank details changed while statements are open: money could go to the wrong account.
  for (const vendor of await VendorModel.find({ 'pendingChanges.payoutProfile.iban': { $exists: true, $ne: null } }).select('name pendingChanges payoutProfile').lean() as any[]) {
    if (vendor.pendingChanges.payoutProfile?.iban && vendor.pendingChanges.payoutProfile.iban !== vendor.payoutProfile?.iban) {
      const open = await PayoutModel.countDocuments({ vendorId: vendor._id, status: 'open' });
      hits.push({ key: `bank-change:${vendor._id}`, rule: 'Payout bank change', subject: vendor.name, score: open ? 93 : 64, reason: `Asked to change the payout bank account${open ? ` with ${open} statement(s) still open` : ''}.` });
    }
  }
  // One CNIC on several partner accounts.
  for (const row of await VendorModel.aggregate([{ $match: { cnicNumber: { $type: 'string', $ne: '' }, deletedAt: null } }, { $group: { _id: '$cnicNumber', names: { $push: '$name' }, count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }])) {
    hits.push({ key: `cnic:${row._id}`, rule: 'Shared CNIC', subject: row.names.join(', '), score: 70, reason: `The same CNIC is on ${row.count} partner accounts.` });
  }

  for (const hit of hits) {
    await FraudCaseModel.updateOne({ key: hit.key }, {
      $set: { rule: hit.rule, subject: hit.subject, bookingRef: hit.bookingRef, score: hit.score, reason: hit.reason },
      $setOnInsert: { history: [{ at: new Date(), by: actor, text: `Flagged by the ${hit.rule.toLowerCase()} rule.` }] },
    }, { upsert: true });
  }
  return { found: hits.length };
}

export const riskOf = (score: number) => score >= 90 ? 'critical' : score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
