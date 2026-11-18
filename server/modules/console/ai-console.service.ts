import { BookingModel } from '../../models/booking.model.js';
import { AiFeatureModel, AiUsageModel } from '../../models/console.models.js';
import { HotelRoomTypeModel } from '../../models/hotel-room-type.model.js';
import { ListingModel } from '../../models/listing.model.js';
import { ReviewModel } from '../../models/review.model.js';
import { SupportCaseModel } from '../../models/support-case.model.js';
import { VendorModel } from '../../models/vendor.model.js';
import { AppError } from '../../shared/app-error.js';
import { escapeRegex } from '../../shared/escape-regex.js';
import { AI_FEATURES, generate, parseJson, type AiFeature } from '../ai/ai-client.js';
import { hasPermission } from '../auth/rbac.js';
import { todayInPakistan } from '../bookings/stay-dates.js';
import { vendorIdsFor } from '../vendors/member-access.js';
import { requireDatabase } from './console.service.js';

type Auth = { userId: string; roles: any[]; extraPermissions?: string[] };
const PLAIN = 'Write plain text, no markdown. Be specific and brief. Never invent facts that are not in the data given.';

/** A listing the caller may ask about: their own as a partner, or any as listing staff. */
async function listingFor(auth: Auth, listingId: string) {
  const listing = await ListingModel.findOne({ publicId: listingId, deletedAt: null }).lean() as any;
  if (!listing) throw new AppError(404, 'LISTING_NOT_FOUND', 'Listing not found.');
  if (hasPermission(auth.roles, 'listing:moderate', auth.extraPermissions)) return listing;
  const vendorIds = (await vendorIdsFor(auth.userId, 'listings')).map(String);
  if (!listing.ownerId || !vendorIds.includes(String(listing.ownerId))) throw new AppError(404, 'LISTING_NOT_FOUND', 'Listing not found.');
  return listing;
}

const town = (location: string) => location.split(',').at(-1)?.trim() ?? location;
const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** Price suggestions from this listing's recent bookings and similar listings in the same town. */
export async function pricingSuggestions(auth: Auth, listingId: string) {
  await requireDatabase();
  const listing = await listingFor(auth, listingId);
  const today = todayInPakistan();
  const [rooms, similar, recent, upcoming] = await Promise.all([
    HotelRoomTypeModel.find({ listingId: listing._id, status: 'active', deletedAt: null }).select('name basePriceMinor totalRooms').lean() as Promise<any[]>,
    ListingModel.find({ type: listing.type, status: 'published', deletedAt: null, _id: { $ne: listing._id }, location: new RegExp(escapeRegex(town(listing.location)), 'i') }).select('title price rating').limit(12).lean() as Promise<any[]>,
    BookingModel.countDocuments({ listingId: listing._id, status: { $in: ['confirmed', 'completed'] }, checkIn: { $gte: addDays(today, -60), $lt: today } }),
    BookingModel.countDocuments({ listingId: listing._id, status: { $in: ['pending', 'confirmed'] }, checkIn: { $gte: today, $lte: addDays(today, 60) } }),
  ]);
  const unit = listing.type === 'car' ? 'per day' : listing.type === 'tour' ? 'per person' : 'per night';
  const data = [
    `Listing: ${listing.title} (${listing.type}) in ${listing.location}. Price from PKR ${listing.price} ${unit}. Rating ${listing.rating || 'none'} from ${listing.reviewsCount} reviews.`,
    `Rooms or units: ${rooms.map((room) => `${room.name} PKR ${room.basePriceMinor / 100} x${room.totalRooms}`).join('; ') || 'none'}.`,
    `Bookings in the last 60 days: ${recent}. Bookings for the next 60 days so far: ${upcoming}. Today is ${today}.`,
    `Similar live listings in ${town(listing.location)}: ${similar.map((item) => `${item.title} PKR ${item.price} (rating ${item.rating || 'none'})`).join('; ') || 'none found'}.`,
  ].join('\n');
  const text = await generate('pricing', auth.userId, {
    system: `You advise a partner on GBBookings, a travel marketplace in Gilgit-Baltistan, Pakistan, about prices in PKR. Peak season there is May to September. ${PLAIN} Answer as JSON: {"suggestions":[{"title":"short action","reason":"one sentence citing the data"}]} with 2 or 3 suggestions.`,
    contents: [{ role: 'user', text: data }], json: true,
  });
  return parseJson<{ suggestions: Array<{ title: string; reason: string }> }>(text).suggestions ?? [];
}

/** A rewritten title and description; the partner edits and saves it themselves. */
export async function contentSuggestion(auth: Auth, listingId: string) {
  await requireDatabase();
  const listing = await listingFor(auth, listingId);
  const text = await generate('content', auth.userId, {
    system: `You improve listing text for GBBookings, a travel marketplace in Gilgit-Baltistan, Pakistan. Keep every fact from the original; add none. No phone numbers, emails or links. ${PLAIN} Answer as JSON: {"title":"max 70 characters","seoTitle":"max 60 characters","description":"120 to 220 words"}.`,
    contents: [{ role: 'user', text: `Type: ${listing.type}\nLocation: ${listing.location}\nTitle: ${listing.title}\nDescription: ${listing.description}` }], json: true,
  });
  return parseJson<{ title: string; seoTitle: string; description: string }>(text);
}

/** What guests praise and complain about, from the latest reviews. */
export async function reviewSummary(auth: Auth, listingId: string) {
  await requireDatabase();
  const listing = await listingFor(auth, listingId);
  const reviews = await ReviewModel.find({ listingId: listing._id, status: 'published' }).sort({ createdAt: -1 }).limit(40).select('overall liked disliked').lean() as any[];
  if (!reviews.length) return { summary: 'No reviews yet.', praise: [], complaints: [] };
  const text = await generate('reviews', auth.userId, {
    system: `You summarise guest reviews for the partner. ${PLAIN} Answer as JSON: {"summary":"two sentences","praise":["up to 3 short points"],"complaints":["up to 3 short points, each with a fix"]}.`,
    contents: [{ role: 'user', text: reviews.map((review) => `${review.overall}/10. Liked: ${review.liked ?? '-'} Disliked: ${review.disliked ?? '-'}`).join('\n') }], json: true,
  });
  return parseJson<{ summary: string; praise: string[]; complaints: string[] }>(text);
}

/** A draft answer to a guest's support case, for the agent to edit and send. */
export async function supportReply(userId: string, caseId: string) {
  await requireDatabase();
  const item = await SupportCaseModel.findOne({ publicId: caseId }).lean() as any;
  if (!item) throw new AppError(404, 'CASE_NOT_FOUND', 'Support case not found.');
  const booking = await BookingModel.findById(item.bookingId).select('reference status paymentMethod paymentStatus checkIn checkOut cancellationPolicy listingSnapshot.title').lean() as any;
  const reply = await generate('support', userId, {
    system: `You draft replies for GBBookings support staff. Be kind and concrete; promise nothing the data does not support (no refunds or changes unless staff decide). ${PLAIN} Reply with only the message text, under 120 words.`,
    contents: [{ role: 'user', text: `Booking ${booking?.reference}: ${booking?.listingSnapshot?.title}, ${booking?.checkIn} to ${booking?.checkOut}, status ${booking?.status}, payment ${booking?.paymentMethod} ${booking?.paymentStatus}, policy ${booking?.cancellationPolicy ?? 'older tiers'}.\nConversation:\n${item.messages.map((message: any) => `${message.from === 'admin' ? 'GBBookings' : 'Guest'}: ${message.body}`).join('\n')}` }],
  });
  return { reply };
}

/** A short read on one partner's performance, from their numbers. */
export async function vendorInsight(userId: string, vendorId: string) {
  await requireDatabase();
  const vendor = await VendorModel.findOne({ publicId: vendorId }).select('name businessType status createdAt').lean() as any;
  if (!vendor) throw new AppError(404, 'VENDOR_NOT_FOUND', 'Partner not found.');
  const [stats] = await BookingModel.aggregate([{ $match: { vendorId: vendor._id } }, { $group: {
    _id: null, total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
    cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }, noShows: { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } },
    revenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$pricing.totalMinor', 0] } },
  } }]);
  const [ratings] = await ReviewModel.aggregate([{ $match: { vendorId: vendor._id, status: 'published' } }, { $group: { _id: null, average: { $avg: '$overall' }, count: { $sum: 1 } } }]);
  const text = await generate('vendor', userId, {
    system: `You brief GBBookings staff on a partner. ${PLAIN} Answer as JSON: {"summary":"two sentences","risks":["up to 3"],"actions":["up to 3"]}.`,
    contents: [{ role: 'user', text: `${vendor.name}, ${vendor.businessType}, ${vendor.status}, joined ${new Date(vendor.createdAt).toISOString().slice(0, 10)}. Bookings ${stats?.total ?? 0}, completed ${stats?.completed ?? 0}, cancelled ${stats?.cancelled ?? 0}, no-shows ${stats?.noShows ?? 0}, completed revenue PKR ${(stats?.revenue ?? 0) / 100}. Average review ${ratings?.average?.toFixed(1) ?? 'none'}/10 from ${ratings?.count ?? 0}.` }], json: true,
  });
  return parseJson<{ summary: string; risks: string[]; actions: string[] }>(text);
}

/** General help with using GBBookings for partners and staff. It sees only what the user types. */
export async function assistantReply(auth: Auth, messages: Array<{ role: 'user' | 'assistant'; text: string }>) {
  const side = auth.roles.some((role) => ['vendor_owner', 'vendor_staff'].includes(role)) ? 'a partner (hotel, homestay, car or tour business)' : 'a GBBookings staff member';
  const reply = await generate('assistant', auth.userId, {
    system: `You help ${side} use GBBookings, a travel marketplace in Gilgit-Baltistan, Pakistan (prices in PKR). You cannot see their account data; ask them for figures if needed and never invent bookings or numbers. Payments: Pay now by card through Safepay, or Pay on arrival. ${PLAIN} Keep answers under 120 words.`,
    contents: messages.map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', text: message.text })),
  });
  return { reply };
}

/**
 * Next 4 weeks: money already booked for stays starting each week, plus a projection from the last 8 weeks' average
 * of new bookings. A simple statistical projection, not a model; labelled as such in the console.
 */
export async function bookingForecast() {
  await requireDatabase();
  const today = todayInPakistan();
  const [upcoming, history] = await Promise.all([
    BookingModel.find({ status: { $in: ['pending', 'confirmed'] }, checkIn: { $gte: today, $lt: addDays(today, 28) } }).select('checkIn pricing.totalMinor pricing.commissionMinor').lean() as Promise<any[]>,
    BookingModel.find({ status: { $in: ['confirmed', 'completed'] }, createdAt: { $gte: new Date(Date.now() - 56 * 86_400_000) } }).select('pricing.totalMinor pricing.commissionMinor').lean() as Promise<any[]>,
  ]);
  const weeklyBookings = history.length / 8;
  const weeklyValue = history.reduce((total, booking) => total + booking.pricing.totalMinor, 0) / 8 / 100;
  const weeklyCommission = history.reduce((total, booking) => total + (booking.pricing.commissionMinor ?? 0), 0) / 8 / 100;
  return {
    basis: 'Booked: stays already booked that start in the week. Projected: the average of the last 8 weeks of new bookings.',
    weeks: [0, 1, 2, 3].map((week) => {
      const start = addDays(today, week * 7);
      const rows = upcoming.filter((booking) => booking.checkIn >= start && booking.checkIn < addDays(start, 7));
      return {
        weekOf: start, bookedCount: rows.length, bookedValue: rows.reduce((total, booking) => total + booking.pricing.totalMinor, 0) / 100,
        bookedCommission: rows.reduce((total, booking) => total + (booking.pricing.commissionMinor ?? 0), 0) / 100,
        projectedCount: Math.round(weeklyBookings), projectedValue: Math.round(weeklyValue), projectedCommission: Math.round(weeklyCommission),
      };
    }),
  };
}

/** Usage per feature over the last 30 days, with each feature's switch. */
export async function aiControl() {
  await requireDatabase();
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [usage, switches] = await Promise.all([
    AiUsageModel.aggregate([{ $match: { at: { $gte: since } } }, { $group: { _id: '$feature', requests: { $sum: 1 }, tokens: { $sum: '$tokens' }, errors: { $sum: { $cond: ['$ok', 0, 1] } } } }]),
    AiFeatureModel.find().lean() as Promise<any[]>,
  ]);
  const byFeature = new Map(usage.map((row) => [row._id, row]));
  const off = new Set(switches.filter((item) => !item.enabled).map((item) => item.feature));
  return (Object.keys(AI_FEATURES) as AiFeature[]).map((feature) => {
    const row = byFeature.get(feature) ?? { requests: 0, tokens: 0, errors: 0 };
    return { feature, label: AI_FEATURES[feature], requests: row.requests, tokens: row.tokens, errorRate: row.requests ? Math.round((row.errors / row.requests) * 1000) / 10 : 0, enabled: !off.has(feature) };
  });
}

export async function setAiFeature(feature: AiFeature, enabled: boolean) {
  await requireDatabase();
  await AiFeatureModel.updateOne({ feature }, { $set: { enabled } }, { upsert: true });
}
