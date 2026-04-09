import { refreshTokenRepository } from "../../infrastructure/repositories/refreshTokenRepository"
import { sessionRepository } from "../../infrastructure/repositories/sessionRepository"
import { sha256 } from "../../shared/hash"
import { logAuditEvent } from "../../infrastructure/audit/auditLogger"

/**
 * Logs out a user by revoking their session.
 * All refresh tokens for the session become invalid on next rotation attempt.
 */
export async function logoutUser(
  refreshToken: string,
  ctx?: { ip?: string; userAgent?: string }
) {
  const token = await refreshTokenRepository.findWithSession(sha256(refreshToken))

  if (!token) throw new Error("Token not found")

  await sessionRepository.update(token.sessionId, { revoked: true })
  await refreshTokenRepository.markUsed(token.id)

  logAuditEvent("LOGOUT", {
    userId:    token.session.userId,
    sessionId: token.sessionId,
    ip:        ctx?.ip,
    userAgent: ctx?.userAgent,
    success:   true,
  })
}
