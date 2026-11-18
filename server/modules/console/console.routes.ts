import { Router, type RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authenticate, authorizePermission } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { BookingModel } from '../../models/booking.model.js';
import { CustomRoleModel, FraudCaseModel, paymentRequestTypes, TaskModel } from '../../models/console.models.js';
import { HotelRoomTypeModel } from '../../models/hotel-room-type.model.js';
import { ListingModel } from '../../models/listing.model.js';
import { MediaModel } from '../../models/media.model.js';
import { SessionModel } from '../../models/session.model.js';
import { staffRoles, UserModel } from '../../models/user.model.js';
import { VendorModel } from '../../models/vendor.model.js';
import { TOWNS, townPlace } from '../../../src/shared/utils/places.js';
import { AppError } from '../../shared/app-error.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { MongoRateLimitStore } from '../../shared/rate-limit-store.js';
import { AI_FEATURES } from '../ai/ai-client.js';
import { recordAuditEvent } from '../audit/audit.service.js';
import { revokeAllSessions, sessionMetadata } from '../auth/auth.service.js';
import { permissionKeys } from '../auth/rbac.js';
import { NewsletterSubscriberModel } from '../newsletter/newsletter.routes.js';
import { vendorIdsFor } from '../vendors/member-access.js';
import { aiControl, assistantReply, bookingForecast, contentSuggestion, pricingSuggestions, reviewSummary, setAiFeature, supportReply, vendorInsight } from './ai-console.service.js';
import { customerRecords, myLoyalty, platformReport, requireDatabase, riskOf, runFraudScan, staffNotifications } from './console.service.js';
import { actOnPartnerRequest, createPartnerRequest, listAllRequests, listGuestRequests, listPartnerRequests } from './payment-requests.service.js';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const page = { page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25) };
const auth = (request: any) => request.auth as { userId: string; roles: any[]; extraPermissions?: string[] };
const pagination = (pageNumber: number, limit: number, total: number) => ({ page: pageNumber, limit, total, pages: Math.ceil(total / limit) });

const requireStaff: RequestHandler = (request, _response, next) => {
  if (!request.auth?.roles.some((role) => (staffRoles as readonly string[]).includes(role))) return next(new AppError(403, 'PERMISSION_DENIED', 'GBBookings staff only.'));
  next();
};
const requireSuperAdmin: RequestHandler = (request, _response, next) => {
  if (!request.auth?.roles.includes('admin')) return next(new AppError(403, 'PERMISSION_DENIED', 'Only the Super Admin can manage staff roles.'));
  next();
};
const aiLimit = rateLimit({
  windowMs: 60 * 60_000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false, store: new MongoRateLimitStore('ai-console:'), passOnStoreError: false,
  keyGenerator: (request) => request.auth?.userId ?? 'anonymous',
  message: { error: { code: 'AI_RATE_LIMITED', message: 'You have used AI a lot this hour. Please try again later.' } },
});

/* ───────────── Staff console ───────────── */
export const consoleRouter = Router();
consoleRouter.use(authenticate);

consoleRouter.get('/reports', authorizePermission('booking:read'), validate('query', z.object({ from: date, to: date }).strict()), asyncHandler(async (request, response) => {
  const { from, to } = request.query as { from: string; to: string };
  if (from > to) throw new AppError(422, 'BAD_RANGE', 'The start date must be before the end date.');
  response.json({ data: await platformReport(from, to) });
}));

consoleRouter.get('/notifications', requireStaff, asyncHandler(async (request, response) => {
  response.json({ data: await staffNotifications(auth(request)) });
}));

consoleRouter.get('/customers', authorizePermission('crm:read'), validate('query', z.object({ search: z.string().trim().max(120).optional(), ...page }).strict()), asyncHandler(async (request, response) => {
  response.json(await customerRecords(request.query as any));
}));

consoleRouter.get('/payment-requests', authorizePermission('booking:read'), validate('query', z.object({ status: z.enum(['draft', 'sent', 'overdue', 'paid', 'cancelled']).optional() }).strict()), asyncHandler(async (request, response) => {
  response.json({ data: await listAllRequests((request.query as any).status) });
}));

/* Fraud review */
consoleRouter.get('/fraud', authorizePermission('fraud:review'), asyncHandler(async (_request, response) => {
  await requireDatabase();
  const cases = await FraudCaseModel.find().sort({ status: 1, score: -1, updatedAt: -1 }).limit(200).lean() as any[];
  response.json({ data: cases.map((item) => ({ id: item.publicId, rule: item.rule, subject: item.subject, bookingRef: item.bookingRef, score: item.score, risk: riskOf(item.score), reason: item.reason, status: item.status, history: item.history, updatedAt: item.updatedAt })) });
}));
consoleRouter.post('/fraud/scan', authorizePermission('fraud:review'), asyncHandler(async (request, response) => {
  const result = await runFraudScan('Scan');
  await recordAuditEvent({ actorId: auth(request).userId, actorType: 'user', action: 'fraud.scan_run', resourceType: 'fraud', ...sessionMetadata(request), metadata: result });
  response.json({ data: result });
}));
consoleRouter.post('/fraud/:id', authorizePermission('fraud:review'), validate('body', z.object({ status: z.enum(['under_review', 'cleared', 'confirmed']), note: z.string().trim().min(3).max(500) }).strict()), asyncHandler(async (request, response) => {
  await requireDatabase();
  const actor = await UserModel.findById(auth(request).userId).select('name').lean() as any;
  const updated = await FraudCaseModel.findOneAndUpdate({ publicId: request.params.id }, { $set: { status: request.body.status }, $push: { history: { at: new Date(), by: actor?.name ?? 'Staff', text: `${request.body.status.replace('_', ' ')}: ${request.body.note}` } } }, { returnDocument: 'after' });
  if (!updated) throw new AppError(404, 'CASE_NOT_FOUND', 'Case not found.');
  await recordAuditEvent({ actorId: auth(request).userId, actorType: 'user', action: `fraud.${request.body.status}`, resourceType: 'fraud_case', resourceId: request.params.id, ...sessionMetadata(request) });
  response.status(204).end();
}));

/* Tasks */
consoleRouter.get('/staff-directory', requireStaff, asyncHandler(async (_request, response) => {
  await requireDatabase();
  const staff = await UserModel.find({ roles: { $in: staffRoles }, status: 'active', deletedAt: null }).select('publicId name roles').sort({ name: 1 }).lean() as any[];
  response.json({ data: staff.map((user) => ({ id: user.publicId, name: user.name, roles: user.roles })) });
}));
consoleRouter.get('/tasks', requireStaff, validate('query', z.object({ scope: z.enum(['mine', 'all']).default('mine'), status: z.enum(['open', 'done']).default('open') }).strict()), asyncHandler(async (request, response) => {
  await requireDatabase();
  const { scope, status } = request.query as any;
  const tasks = await TaskModel.find({ status, ...(scope === 'mine' ? { assigneeId: auth(request).userId } : {}) }).sort({ dueDate: 1, createdAt: -1 }).limit(200).lean() as any[];
  const people = new Map((await UserModel.find({ _id: { $in: tasks.flatMap((task) => [task.assigneeId, task.createdBy]) } }).select('name').lean() as any[]).map((user) => [String(user._id), user.name]));
  response.json({ data: tasks.map((task) => ({ id: task.publicId, title: task.title, note: task.note, dueDate: task.dueDate, status: task.status, assignee: people.get(String(task.assigneeId)), createdBy: people.get(String(task.createdBy)), mine: String(task.assigneeId) === auth(request).userId, doneAt: task.doneAt })) });
}));
consoleRouter.post('/tasks', requireStaff, validate('body', z.object({ title: z.string().trim().min(3).max(200), note: z.string().trim().max(2_000).optional(), assigneeId: z.string().regex(/^usr_/), dueDate: date.optional() }).strict()), asyncHandler(async (request, response) => {
  await requireDatabase();
  const assignee = await UserModel.findOne({ publicId: request.body.assigneeId, roles: { $in: staffRoles }, status: 'active' }).select('_id').lean() as any;
  if (!assignee) throw new AppError(404, 'STAFF_NOT_FOUND', 'Choose an active staff member.');
  const task = await TaskModel.create({ title: request.body.title, note: request.body.note, dueDate: request.body.dueDate, assigneeId: assignee._id, createdBy: auth(request).userId });
  response.status(201).json({ data: { id: task.publicId } });
}));
consoleRouter.post('/tasks/:id/:action', requireStaff, validate('params', z.object({ id: z.string().regex(/^tsk_/), action: z.enum(['done', 'reopen']) }).strict()), asyncHandler(async (request, response) => {
  await requireDatabase();
  const done = request.params.action === 'done';
  const updated = await TaskModel.updateOne({ publicId: request.params.id }, done ? { $set: { status: 'done', doneAt: new Date() } } : { $set: { status: 'open' }, $unset: { doneAt: 1 } });
  if (!updated.matchedCount) throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found.');
  response.status(204).end();
}));

/* Security center */
consoleRouter.get('/security-center', authorizePermission('user:manage'), asyncHandler(async (_request, response) => {
  await requireDatabase();
  const staff = await UserModel.find({ roles: { $in: staffRoles }, deletedAt: null }).select('+failedLoginAttempts +lockedUntil publicId name email roles status twoFactor passwordChangedAt').lean() as any[];
  const sessions = await SessionModel.aggregate([{ $match: { userId: { $in: staff.map((user) => user._id) }, revokedAt: null, expiresAt: { $gt: new Date() } } }, { $group: { _id: '$userId', count: { $sum: 1 } } }]);
  const counts = new Map(sessions.map((row) => [String(row._id), row.count]));
  response.json({ data: staff.map((user) => ({
    id: user.publicId, name: user.name, email: user.email, roles: user.roles, status: user.status,
    // Staff always get a two-step code on a new device (auth.service needsTwoStep).
    twoStep: user.twoFactor?.enabled ? `On (${user.twoFactor.channel})` : 'Email code on new devices',
    locked: Boolean(user.lockedUntil && new Date(user.lockedUntil) > new Date()), failedLogins: user.failedLoginAttempts ?? 0,
    activeSessions: counts.get(String(user._id)) ?? 0, passwordChangedAt: user.passwordChangedAt,
  })) });
}));
consoleRouter.post('/security-center/:id/:action', authorizePermission('user:manage'), validate('params', z.object({ id: z.string().regex(/^usr_/), action: z.enum(['sign-out', 'unlock']) }).strict()), asyncHandler(async (request, response) => {
  await requireDatabase();
  const user = await UserModel.findOne({ publicId: request.params.id, roles: { $in: staffRoles } }).select('_id');
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Staff account not found.');
  if (request.params.action === 'sign-out') {
    if (String(user._id) === auth(request).userId) throw new AppError(409, 'CANNOT_MODIFY_SELF', 'Use Account security to sign out your own devices.');
    await revokeAllSessions(String(user._id));
  } else await UserModel.updateOne({ _id: user._id }, { $set: { failedLoginAttempts: 0, lockedUntil: null } });
  await recordAuditEvent({ actorId: auth(request).userId, actorType: 'user', action: `staff.${request.params.action}`, resourceType: 'user', resourceId: request.params.id, ...sessionMetadata(request) });
  response.status(204).end();
}));

/* Automation center: what runs on its own (see jobs/scheduled.ts and jobs/inngest.ts). */
const AUTOMATIONS = [
  ['Expire unanswered bookings', 'Every 5 minutes', 'Releases booking requests the partner did not answer in time, and unpaid Pay now holds.'],
  ['Send refunds', 'Every 5 minutes', 'Sends payment provider refunds when automatic refunds are switched on; otherwise they wait in Refunds.'],
  ['Message alerts', 'Every 5 minutes', 'Emails guests and partners about chat messages they have not read.'],
  ['Complete finished stays', 'Every 5 minutes', 'Marks stays as completed 48 hours after they end, unless the partner reported a no-show.'],
  ['Duplicate payment check', 'Every 5 minutes', 'Finds guests who paid twice and queues the extra payment for refund.'],
  ['Calendar sync', 'Every 5 minutes', 'Reads partners’ other booking-site calendars and blocks those dates.'],
  ['Trip reminders and review invites', 'Daily', 'Emails guests 2 days before a trip, and asks for a review after it.'],
  ['Room count check', 'Daily', 'Recounts booked nights and fixes any counter that drifted.'],
] as const;
consoleRouter.get('/automations', authorizePermission('audit:read'), (_request, response) => {
  response.json({ data: AUTOMATIONS.map(([name, schedule, description]) => ({ name, schedule, description })) });
});

/* Channel manager: every linked outside calendar and how its last sync went. */
consoleRouter.get('/channel-feeds', authorizePermission('listing:moderate'), asyncHandler(async (_request, response) => {
  await requireDatabase();
  const rooms = await HotelRoomTypeModel.find({ 'icalFeeds.0': { $exists: true }, deletedAt: null }).select('name listingId icalFeeds icalConflicts icalSyncedAt').lean() as any[];
  const listings = new Map((await ListingModel.find({ _id: { $in: rooms.map((room) => room.listingId) } }).select('title').lean() as any[]).map((listing) => [String(listing._id), listing.title]));
  response.json({ data: rooms.flatMap((room) => room.icalFeeds.map((feed: any) => ({
    listing: listings.get(String(room.listingId)), room: room.name, channel: feed.name, lastSyncAt: feed.lastSyncAt, error: feed.lastError || undefined, conflicts: (room.icalConflicts ?? []).length,
  }))) });
}));

/* Media & documents */
consoleRouter.get('/media', authorizePermission('listing:moderate'), validate('query', z.object({ kind: z.enum(['image', 'document', 'video']).optional(), ...page }).strict()), asyncHandler(async (request, response) => {
  await requireDatabase();
  const { kind, page: pageNumber, limit } = request.query as any;
  const filter = { deletedAt: null, ...(kind ? { resourceType: kind } : {}) };
  const [items, total] = await Promise.all([MediaModel.find(filter).sort({ createdAt: -1 }).skip((pageNumber - 1) * limit).limit(limit).lean() as Promise<any[]>, MediaModel.countDocuments(filter)]);
  const vendors = new Map((await VendorModel.find({ _id: { $in: items.map((item) => item.vendorId).filter(Boolean) } }).select('name').lean() as any[]).map((vendor) => [String(vendor._id), vendor.name]));
  // Identity documents are private: staff open them from the partner's application, not from here.
  response.json({ data: items.map((item) => ({ id: item.publicId, kind: item.resourceType, mimeType: item.mimeType, bytes: item.bytes, status: item.status, partner: vendors.get(String(item.vendorId)), url: item.deliveryType === 'upload' && item.resourceType === 'image' ? item.url : undefined, createdAt: item.createdAt })), pagination: pagination(pageNumber, limit, total) });
}));

/* Destinations: the towns on the website and what is live in each. */
consoleRouter.get('/destinations', authorizePermission('listing:moderate'), asyncHandler(async (_request, response) => {
  await requireDatabase();
  const listings = await ListingModel.find({ status: 'published', deletedAt: null }).select('type location').lean() as any[];
  response.json({ data: TOWNS.map((town) => {
    const place = townPlace(town).toLowerCase();
    const here = listings.filter((listing) => listing.location.toLowerCase().includes(place));
    return { name: town, total: here.length, hotel: here.filter((item) => item.type === 'hotel').length, homestay: here.filter((item) => item.type === 'homestay').length, car: here.filter((item) => item.type === 'car').length, tour: here.filter((item) => item.type === 'tour').length };
  }) });
}));

/* Guides: tour companies and independent guides. */
consoleRouter.get('/guides', authorizePermission('vendor:manage'), asyncHandler(async (_request, response) => {
  await requireDatabase();
  const vendors = await VendorModel.find({ businessType: 'tour_operator', deletedAt: null }).select('publicId name email phone status registrationNumber address.city verificationDocuments.type createdAt').sort({ createdAt: -1 }).lean() as any[];
  const tours = await ListingModel.aggregate([{ $match: { type: 'tour', deletedAt: null, ownerId: { $in: vendors.map((vendor) => vendor._id) } } }, { $group: { _id: '$ownerId', total: { $sum: 1 }, live: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } } } }]);
  const byVendor = new Map(tours.map((row) => [String(row._id), row]));
  response.json({ data: vendors.map((vendor) => ({
    id: vendor.publicId, name: vendor.name, email: vendor.email, phone: vendor.phone, status: vendor.status, city: vendor.address?.city,
    kind: vendor.registrationNumber ? 'Tour company' : 'Independent guide', licence: (vendor.verificationDocuments ?? []).some((doc: any) => doc.type === 'guide_licence'),
    tours: byVendor.get(String(vendor._id))?.total ?? 0, liveTours: byVendor.get(String(vendor._id))?.live ?? 0,
  })) });
}));

/* Marketing: newsletter subscribers. Campaigns are sent from a mailing tool with the exported list. */
consoleRouter.get('/subscribers', authorizePermission('user:manage'), validate('query', z.object({ format: z.enum(['json', 'csv']).default('json') }).strict()), asyncHandler(async (request, response) => {
  await requireDatabase();
  const subscribers = await NewsletterSubscriberModel.find({ unsubscribedAt: null }).sort({ createdAt: -1 }).lean() as any[];
  if ((request.query as any).format === 'csv') {
    await recordAuditEvent({ actorId: auth(request).userId, actorType: 'user', action: 'marketing.subscribers_exported', resourceType: 'newsletter', ...sessionMetadata(request), metadata: { count: subscribers.length } });
    response.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="gbbookings-subscribers.csv"', 'Cache-Control': 'no-store' })
      .send(['email,source,subscribed', ...subscribers.map((item) => `${item.email},${item.source},${new Date(item.createdAt).toISOString().slice(0, 10)}`)].join('\n'));
    return;
  }
  response.json({ data: subscribers.map((item) => ({ email: item.email, source: item.source, subscribedAt: item.createdAt })) });
}));

/* Custom roles */
const roleBody = z.object({ name: z.string().trim().min(2).max(60), permissions: z.array(z.enum(permissionKeys as [string, ...string[]])).max(permissionKeys.length), status: z.enum(['active', 'disabled']).default('active') }).strict();
consoleRouter.get('/custom-roles', authorizePermission('user:manage'), asyncHandler(async (_request, response) => {
  await requireDatabase();
  const roles = await CustomRoleModel.find().sort({ name: 1 }).lean() as any[];
  const users = await UserModel.aggregate([{ $match: { customRoleId: { $in: roles.map((role) => role._id) }, deletedAt: null } }, { $group: { _id: '$customRoleId', count: { $sum: 1 } } }]);
  const counts = new Map(users.map((row) => [String(row._id), row.count]));
  response.json({ data: roles.map((role) => ({ id: role.publicId, name: role.name, permissions: role.permissions, status: role.status, users: counts.get(String(role._id)) ?? 0 })) });
}));
consoleRouter.post('/custom-roles', requireSuperAdmin, validate('body', roleBody), asyncHandler(async (request, response) => {
  await requireDatabase();
  try {
    const role = await CustomRoleModel.create(request.body);
    await recordAuditEvent({ actorId: auth(request).userId, actorType: 'user', action: 'custom_role.created', resourceType: 'custom_role', resourceId: role.publicId, ...sessionMetadata(request), metadata: request.body });
    response.status(201).json({ data: { id: role.publicId } });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw new AppError(409, 'ROLE_EXISTS', 'A role with this name already exists.');
    throw error;
  }
}));
consoleRouter.put('/custom-roles/:id', requireSuperAdmin, validate('body', roleBody), asyncHandler(async (request, response) => {
  await requireDatabase();
  const before = await CustomRoleModel.findOneAndUpdate({ publicId: request.params.id }, { $set: request.body }).lean() as any;
  if (!before) throw new AppError(404, 'ROLE_NOT_FOUND', 'Role not found.');
  await recordAuditEvent({ actorId: auth(request).userId, actorType: 'user', action: 'custom_role.updated', resourceType: 'custom_role', resourceId: request.params.id, ...sessionMetadata(request), metadata: { before: { name: before.name, permissions: before.permissions, status: before.status }, after: request.body } });
  response.status(204).end();
}));

/* AI for staff */
consoleRouter.get('/ai/control', authorizePermission('user:manage'), asyncHandler(async (_request, response) => { response.json({ data: await aiControl() }); }));
consoleRouter.post('/ai/control', authorizePermission('user:manage'), validate('body', z.object({ feature: z.enum(Object.keys(AI_FEATURES) as [string, ...string[]]), enabled: z.boolean() }).strict()), asyncHandler(async (request, response) => {
  await setAiFeature(request.body.feature, request.body.enabled);
  await recordAuditEvent({ actorId: auth(request).userId, actorType: 'user', action: 'ai.feature_switched', resourceType: 'ai_feature', resourceId: request.body.feature, ...sessionMetadata(request), metadata: { enabled: request.body.enabled } });
  response.status(204).end();
}));
consoleRouter.get('/ai/forecast', authorizePermission('finance:manage'), asyncHandler(async (_request, response) => { response.json({ data: await bookingForecast() }); }));
consoleRouter.post('/ai/support', authorizePermission('support:manage'), aiLimit, validate('body', z.object({ caseId: z.string().regex(/^sup_/) }).strict()), asyncHandler(async (request, response) => {
  response.json({ data: await supportReply(auth(request).userId, request.body.caseId) });
}));
consoleRouter.post('/ai/vendor', authorizePermission('vendor:manage'), aiLimit, validate('body', z.object({ vendorId: z.string().min(3).max(80) }).strict()), asyncHandler(async (request, response) => {
  response.json({ data: await vendorInsight(auth(request).userId, request.body.vendorId) });
}));

/* ───────────── Shared by partners and staff: listing AI and the assistant ───────────── */
export const aiToolsRouter = Router();
aiToolsRouter.use(authenticate, aiLimit);
const listingBody = validate('body', z.object({ listingId: z.string().min(3).max(80) }).strict());
aiToolsRouter.post('/pricing', listingBody, asyncHandler(async (request, response) => { response.json({ data: await pricingSuggestions(auth(request), request.body.listingId) }); }));
aiToolsRouter.post('/content', listingBody, asyncHandler(async (request, response) => { response.json({ data: await contentSuggestion(auth(request), request.body.listingId) }); }));
aiToolsRouter.post('/reviews', listingBody, asyncHandler(async (request, response) => { response.json({ data: await reviewSummary(auth(request), request.body.listingId) }); }));
aiToolsRouter.post('/assistant', validate('body', z.object({ messages: z.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().trim().min(1).max(1_000) }).strict()).min(1).max(20) }).strict()), asyncHandler(async (request, response) => {
  if (auth(request).roles.every((role) => role === 'customer')) throw new AppError(403, 'PERMISSION_DENIED', 'Guests can use the trip planner on the website.');
  response.json({ data: await assistantReply(auth(request), request.body.messages) });
}));

/* ───────────── Partner ───────────── */
export const partnerConsoleRouter = Router();
partnerConsoleRouter.use(authenticate, authorizePermission('booking:read:own'));
partnerConsoleRouter.get('/payment-requests', validate('query', z.object({ status: z.enum(['draft', 'sent', 'overdue', 'paid', 'cancelled']).optional() }).strict()), asyncHandler(async (request, response) => {
  response.json({ data: await listPartnerRequests(auth(request).userId, (request.query as any).status) });
}));
partnerConsoleRouter.post('/payment-requests', validate('body', z.object({
  bookingReference: z.string().trim().min(4).max(20), type: z.enum(paymentRequestTypes), amount: z.number().min(1).max(10_000_000), dueDate: date,
  note: z.string().trim().max(500).optional(), send: z.boolean(),
}).strict()), asyncHandler(async (request, response) => {
  response.status(201).json({ data: await createPartnerRequest(auth(request).userId, request.body, sessionMetadata(request)) });
}));
partnerConsoleRouter.post('/payment-requests/:id/:action', validate('params', z.object({ id: z.string().regex(/^prq_/), action: z.enum(['send', 'paid', 'cancel']) }).strict()), asyncHandler(async (request, response) => {
  response.json({ data: await actOnPartnerRequest(auth(request).userId, request.params.id, request.params.action as any, sessionMetadata(request)) });
}));
/** The business's uploaded photos and documents. */
partnerConsoleRouter.get('/documents', validate('query', z.object({ kind: z.enum(['image', 'document']).optional() }).strict()), asyncHandler(async (request, response) => {
  await requireDatabase();
  const vendorIds = await vendorIdsFor(auth(request).userId, 'listings');
  const kind = (request.query as any).kind;
  const items = await MediaModel.find({ vendorId: { $in: vendorIds }, deletedAt: null, ...(kind ? { resourceType: kind } : {}) }).sort({ createdAt: -1 }).limit(300).lean() as any[];
  response.json({ data: items.map((item) => ({ id: item.publicId, kind: item.resourceType, mimeType: item.mimeType, bytes: item.bytes, status: item.status, alt: item.alt, url: item.deliveryType === 'upload' ? item.url : undefined, createdAt: item.createdAt })) });
}));

/* ───────────── Guest ───────────── */
export const guestConsoleRouter = Router();
guestConsoleRouter.use(authenticate, authorizePermission('booking:read:own'));
/** Every payment, refund and partner payment request on the guest's own bookings. */
guestConsoleRouter.get('/payments', asyncHandler(async (request, response) => {
  await requireDatabase();
  const bookings = await BookingModel.find({ customerId: auth(request).userId }).sort({ createdAt: -1 }).limit(200)
    .select('publicId reference status paymentMethod paymentStatus paidAt pricing.totalMinor pricing.balanceDueMinor refunds listingSnapshot.title checkIn createdAt').lean() as any[];
  response.json({ data: {
    payments: bookings.map((booking) => ({
      bookingId: booking.publicId, reference: booking.reference, listingTitle: booking.listingSnapshot?.title, checkIn: booking.checkIn, bookingStatus: booking.status,
      method: booking.paymentMethod === 'online' ? 'Pay now (online)' : 'Pay on arrival', status: booking.paymentStatus, total: booking.pricing.totalMinor / 100,
      balanceDue: (booking.pricing.balanceDueMinor ?? 0) / 100, paidAt: booking.paidAt,
    })),
    refunds: bookings.flatMap((booking) => (booking.refunds ?? []).map((refund: any) => ({
      reference: booking.reference, listingTitle: booking.listingSnapshot?.title, amount: refund.amountMinor / 100, status: refund.status === 'sent' ? 'sent' : 'on its way',
      channel: refund.channel === 'safepay' ? 'Back to your card or wallet' : 'From the partner', sentAt: refund.sentAt, createdAt: refund.createdAt,
    }))),
    requests: await listGuestRequests(auth(request).userId),
  } });
}));
guestConsoleRouter.get('/loyalty', asyncHandler(async (request, response) => { response.json({ data: await myLoyalty(auth(request).userId) }); }));
