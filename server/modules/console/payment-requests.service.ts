import { BookingModel } from '../../models/booking.model.js';
import { PaymentRequestModel, paymentRequestTypes } from '../../models/console.models.js';
import { UserModel } from '../../models/user.model.js';
import { VendorModel } from '../../models/vendor.model.js';
import { AppError } from '../../shared/app-error.js';
import { recordAuditEvent } from '../audit/audit.service.js';
import type { SessionMetadata } from '../auth/auth.service.js';
import { todayInPakistan } from '../bookings/stay-dates.js';
import { escapeHtml } from '../email/auth-email.templates.js';
import { isEmailConfigured, sendTransactionalEmail } from '../email/resend.service.js';
import { vendorIdsFor } from '../vendors/member-access.js';
import { requireDatabase } from './console.service.js';

export type PaymentRequestType = typeof paymentRequestTypes[number];
export const TYPE_LABEL: Record<PaymentRequestType, string> = {
  remaining_balance: 'Remaining balance', booking_advance: 'Booking advance', partial_payment: 'Partial payment',
  cancellation_fee: 'Cancellation fee', additional_service: 'Additional service',
};

async function serialize(requests: any[]) {
  const [bookings, vendors] = await Promise.all([
    BookingModel.find({ _id: { $in: requests.map((item) => item.bookingId) } }).select('reference guest.name listingSnapshot.title').lean() as Promise<any[]>,
    VendorModel.find({ _id: { $in: requests.map((item) => item.vendorId) } }).select('name').lean() as Promise<any[]>,
  ]);
  const booking = new Map(bookings.map((item) => [String(item._id), item]));
  const vendor = new Map(vendors.map((item) => [String(item._id), item.name]));
  const today = todayInPakistan();
  return requests.map((item) => ({
    id: item.publicId, type: item.type, typeLabel: TYPE_LABEL[item.type as PaymentRequestType], amount: item.amountMinor / 100, dueDate: item.dueDate, note: item.note,
    // Overdue is a sent request past its due date.
    status: item.status === 'sent' && item.dueDate < today ? 'overdue' : item.status,
    bookingReference: booking.get(String(item.bookingId))?.reference, guestName: booking.get(String(item.bookingId))?.guest?.name,
    listingTitle: booking.get(String(item.bookingId))?.listingSnapshot?.title, partnerName: vendor.get(String(item.vendorId)),
    createdAt: item.createdAt, sentAt: item.sentAt, paidAt: item.paidAt,
  }));
}

const statusFilter = (status?: string) => status === 'overdue' ? { status: 'sent', dueDate: { $lt: todayInPakistan() } } : status ? { status } : {};

export async function listPartnerRequests(userId: string, status?: string) {
  await requireDatabase();
  const vendorIds = await vendorIdsFor(userId, 'reports');
  if (!vendorIds.length) throw new AppError(403, 'VENDOR_ACCESS_REQUIRED', 'Payment requests are available to the partner owner, managers and finance.');
  return serialize(await PaymentRequestModel.find({ vendorId: { $in: vendorIds }, ...statusFilter(status) }).sort({ createdAt: -1 }).limit(200).lean());
}

export async function listGuestRequests(userId: string) {
  await requireDatabase();
  return serialize(await PaymentRequestModel.find({ customerId: userId, status: { $in: ['sent', 'paid'] } }).sort({ createdAt: -1 }).limit(100).lean());
}

export async function listAllRequests(status?: string) {
  await requireDatabase();
  return serialize(await PaymentRequestModel.find(statusFilter(status)).sort({ createdAt: -1 }).limit(200).lean());
}

async function emailGuest(request: any) {
  if (!isEmailConfigured()) return;
  const [booking, guest, vendor] = await Promise.all([
    BookingModel.findById(request.bookingId).select('reference listingSnapshot.title').lean() as Promise<any>,
    UserModel.findById(request.customerId).select('name email').lean() as Promise<any>,
    VendorModel.findById(request.vendorId).select('name').lean() as Promise<any>,
  ]);
  if (!guest) return;
  await sendTransactionalEmail({
    to: { email: guest.email, name: guest.name }, subject: `Payment request for ${booking.reference}`, tag: 'payment-request',
    htmlContent: `<p>Hello ${escapeHtml(guest.name)},</p><p>${escapeHtml(vendor?.name ?? 'Your host')} asks for <strong>PKR ${(request.amountMinor / 100).toLocaleString('en-PK')}</strong> (${TYPE_LABEL[request.type as PaymentRequestType].toLowerCase()}) for your booking ${escapeHtml(booking.reference)} at ${escapeHtml(booking.listingSnapshot?.title ?? '')}, due by ${request.dueDate}.</p>${request.note ? `<p>${escapeHtml(request.note)}</p>` : ''}<p>Pay the partner directly, for example on arrival. You can see it under Payments &amp; refunds in your GBBookings account. If anything looks wrong, contact GBBookings support.</p>`,
  }).catch((error) => console.warn(`Payment request email failed: ${error.message}`));
}

export async function createPartnerRequest(userId: string, input: { bookingReference: string; type: PaymentRequestType; amount: number; dueDate: string; note?: string; send: boolean }, metadata: SessionMetadata) {
  await requireDatabase();
  const vendorIds = await vendorIdsFor(userId, 'reports');
  if (!vendorIds.length) throw new AppError(403, 'VENDOR_ACCESS_REQUIRED', 'Payment requests are available to the partner owner, managers and finance.');
  const booking = await BookingModel.findOne({ reference: input.bookingReference.trim().toUpperCase(), vendorId: { $in: vendorIds } }).select('vendorId customerId status').lean() as any;
  if (!booking) throw new AppError(404, 'BOOKING_NOT_FOUND', 'No booking of yours has that reference.');
  if (!['pending', 'confirmed', 'completed'].includes(booking.status)) throw new AppError(409, 'BOOKING_CLOSED', 'You can only ask for payment on a live or completed booking.');
  if (input.dueDate < todayInPakistan()) throw new AppError(422, 'DUE_DATE_PAST', 'Choose a due date from today on.');
  const request = await PaymentRequestModel.create({
    vendorId: booking.vendorId, bookingId: booking._id, customerId: booking.customerId, type: input.type,
    amountMinor: Math.round(input.amount * 100), dueDate: input.dueDate, note: input.note, createdBy: userId,
    ...(input.send ? { status: 'sent', sentAt: new Date() } : {}),
  });
  await recordAuditEvent({ actorId: userId, actorType: 'user', action: 'payment_request.created', resourceType: 'payment_request', resourceId: request.publicId, ...metadata, metadata: { amountMinor: request.amountMinor, sent: input.send } });
  if (input.send) await emailGuest(request);
  return (await serialize([request.toObject()]))[0];
}

/** send: draft → sent. paid: sent → paid (the partner got the money). cancel: draft or sent → cancelled. */
export async function actOnPartnerRequest(userId: string, requestId: string, action: 'send' | 'paid' | 'cancel', metadata: SessionMetadata) {
  await requireDatabase();
  const vendorIds = await vendorIdsFor(userId, 'reports');
  if (!vendorIds.length) throw new AppError(403, 'VENDOR_ACCESS_REQUIRED', 'Payment requests are available to the partner owner, managers and finance.');
  const from = { send: ['draft'], paid: ['sent'], cancel: ['draft', 'sent'] }[action];
  const set = action === 'send' ? { status: 'sent', sentAt: new Date() } : action === 'paid' ? { status: 'paid', paidAt: new Date() } : { status: 'cancelled', cancelledAt: new Date() };
  const request = await PaymentRequestModel.findOneAndUpdate({ publicId: requestId, vendorId: { $in: vendorIds }, status: { $in: from } }, { $set: set }, { returnDocument: 'after' }).lean() as any;
  if (!request) throw new AppError(409, 'REQUEST_CHANGED', 'This request cannot be changed that way any more. Reload the page.');
  await recordAuditEvent({ actorId: userId, actorType: 'user', action: `payment_request.${action}`, resourceType: 'payment_request', resourceId: requestId, ...metadata });
  if (action === 'send') await emailGuest(request);
  return (await serialize([request]))[0];
}
