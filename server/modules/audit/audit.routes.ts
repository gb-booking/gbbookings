import { Router } from 'express';
import { z } from 'zod';
import { connectDatabase } from '../../database/connection.js';
import { authenticate, authorizePermission } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { AuditLogModel } from '../../models/audit-log.model.js';
import { UserModel } from '../../models/user.model.js';
import { ServiceUnavailableError } from '../../shared/app-error.js';
import { asyncHandler } from '../../shared/async-handler.js';

const querySchema = z.object({
  // 'security' is sign-ins and account protection; 'activity' is everything else.
  kind: z.enum(['activity', 'security']).default('activity'),
  // Only the signed-in staff member's own actions (Activity history).
  mine: z.literal('1').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
}).strict();

/** Read-only view of the audit log for the console's Audit logs, Security log and Activity history pages. */
export const adminAuditRouter = Router();
adminAuditRouter.use(authenticate, authorizePermission('audit:read'));

adminAuditRouter.get('/', validate('query', querySchema), asyncHandler(async (request, response) => {
  if (!await connectDatabase()) throw new ServiceUnavailableError('The audit log is unavailable while the database is disconnected.');
  const query = request.query as unknown as z.infer<typeof querySchema>;
  const filter: Record<string, unknown> = { action: query.kind === 'security' ? /^auth\./ : { $not: /^auth\./ } };
  if (query.mine) filter.actorId = request.auth!.userId;
  const [rows, total] = await Promise.all([
    AuditLogModel.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean() as Promise<any[]>,
    AuditLogModel.countDocuments(filter),
  ]);
  const actors = new Map((await UserModel.find({ _id: { $in: rows.map((row) => row.actorId).filter(Boolean) } }).select('name email').lean() as any[])
    .map((user) => [String(user._id), user]));
  response.json({
    data: rows.map((row) => {
      const actor = row.actorId ? actors.get(String(row.actorId)) : undefined;
      return {
        id: row.publicId, action: row.action, resourceType: row.resourceType, resourceId: row.resourceId,
        actor: actor ? `${actor.name} (${actor.email})` : row.actorType === 'system' ? 'System' : 'Unknown',
        ipAddress: row.ipAddress, userAgent: row.userAgent, at: row.createdAt,
      };
    }),
    pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
  });
}));
