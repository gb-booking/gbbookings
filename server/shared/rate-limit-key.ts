import type { Request } from 'express';
import { ipKeyGenerator } from 'express-rate-limit';
import { connectDatabase } from '../database/connection.js';
import { SessionModel } from '../models/session.model.js';
import { ACCESS_COOKIE, REFRESH_COOKIE, hashToken, verifyAccessToken } from '../modules/auth/auth.tokens.js';
import { ServiceUnavailableError } from './app-error.js';

const anonymousKey = (request: Request) => `ip:${ipKeyGenerator(request.ip ?? request.socket.remoteAddress ?? 'unknown')}`;

/** A signed token identifies the rate-limit bucket only; route authentication still checks the live session. */
export function apiRateLimitKey(request: Request) {
  const token = request.cookies?.[ACCESS_COOKIE];
  if (typeof token === 'string') {
    try {
      const { sub } = verifyAccessToken(token);
      if (sub) return `user:${sub}`;
    } catch { /* Anonymous and expired tokens share the IP fallback. */ }
  }
  return anonymousKey(request);
}

/** Refresh tokens rotate, but their session's counter must stay the same. */
export async function refreshRateLimitKey(request: Request) {
  const token = request.cookies?.[REFRESH_COOKIE];
  if (typeof token !== 'string' || !token) return anonymousKey(request);
  if (!await connectDatabase()) throw new ServiceUnavailableError('Authentication is unavailable while the database is disconnected.');
  const tokenHash = hashToken(token);
  const session = await SessionModel.findOne({
    $or: [{ refreshTokenHash: tokenHash }, { previousRefreshTokenHash: tokenHash }],
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).select('publicId').lean();
  return session ? `session:${session.publicId}` : anonymousKey(request);
}
