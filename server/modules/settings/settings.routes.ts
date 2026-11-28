import { Router } from 'express';
import { authenticate, authorizePermission } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { sessionMetadata } from '../auth/auth.service.js';
import { getPlatformProfile, getPlatformSettings, platformProfileSchema, platformSettingsSchema, requireSettingsDatabase, updatePlatformProfile, updatePlatformSettings } from './settings.service.js';

export const adminSettingsRouter = Router();

adminSettingsRouter.use(authenticate, authorizePermission('finance:manage'));

adminSettingsRouter.get('/', asyncHandler(async (_request, response) => {
  await requireSettingsDatabase();
  response.json({ data: await getPlatformSettings() });
}));

adminSettingsRouter.put('/', validate('body', platformSettingsSchema), asyncHandler(async (request, response) => {
  await requireSettingsDatabase();
  response.json({ data: await updatePlatformSettings(request.auth!.userId, request.body, sessionMetadata(request)) });
}));

/** Platform identity, language and currency. Super Admin only (platform:manage). */
export const adminPlatformRouter = Router();

adminPlatformRouter.use(authenticate, authorizePermission('platform:manage'));

adminPlatformRouter.get('/', asyncHandler(async (_request, response) => {
  await requireSettingsDatabase();
  response.json({ data: await getPlatformProfile() });
}));

adminPlatformRouter.put('/', validate('body', platformProfileSchema), asyncHandler(async (request, response) => {
  await requireSettingsDatabase();
  response.json({ data: await updatePlatformProfile(request.auth!.userId, request.body, sessionMetadata(request)) });
}));

/** The guest refund rules, public so the Refund Policy page always shows what the admin set. */
export const publicSettingsRouter = Router();

publicSettingsRouter.get('/refunds', asyncHandler(async (_request, response) => {
  await requireSettingsDatabase();
  const { refundTiers, laterRefundPercent } = await getPlatformSettings();
  response.json({ data: { refundTiers, laterRefundPercent } });
}));

/** GBBookings' current commission per listing type and the guest service fee, shown to businesses and on the partner agreement. */
publicSettingsRouter.get('/commission', asyncHandler(async (_request, response) => {
  await requireSettingsDatabase();
  const { commissionPercents, serviceFeePercent } = await getPlatformSettings();
  response.json({ data: { commissionPercents, serviceFeePercent } });
}));
