import { refreshTokenRepository } from "../../infrastructure/repositories/refreshTokenRepository"
import { sessionRepository } from "../../infrastructure/repositories/sessionRepository"
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../../infrastructure/jwt"
import { sha256 } from "../../shared/hash"
import { logAuditEvent } from "../../infrastructure/audit/auditLogger"

export async function rotateRefreshToken(
  oldToken: string,
  ctx?: { ip?: string; userAgent?: string }
) {
  // Verify JWT signature and expiry first — rejects tokens that have expired
  // even if they still exist in the DB as unused
  let payload
  try {
    payload = verifyRefreshToken(oldToken)
  } catch {
    throw new Error("Refresh token is invalid or expired")
  }

  const existing = await refreshTokenRepository.findWithSessionAndUser(sha256(oldToken))

  if (!existing) {
    throw new Error("Refresh token not found")
  }

  if (existing.used) {
    await sessionRepository.update(existing.sessionId, { revoked: true })
    logAuditEvent("TOKEN_REUSE_DETECTED", {
      userId:    existing.session.userId,
      sessionId: existing.sessionId,
      ip:        ctx?.ip,
      userAgent: ctx?.userAgent,
      success:   false,
      metadata:  { familyId: existing.session.familyId },
    })
    throw new Error("Refresh token already used — session revoked")
  }

  if (existing.session.revoked) {
    throw new Error("Session has been revoked")
  }

  const { session } = existing
  const { user } = session

  if (payload.tokenVersion !== user.tokenVersion) {
    await sessionRepository.update(session.id, { revoked: true })
    throw new Error("Token has been revoked")
  }

  await refreshTokenRepository.markUsed(existing.id)

  const updatedSession = await sessionRepository.update(session.id, {
    refreshCounter: { increment: 1 },
    lastUsedAt: new Date(),
  })

  const newRefreshToken = generateRefreshToken({
    userId:       user.id,
    sessionId:    session.id,
    familyId:     session.familyId,
    counter:      updatedSession.refreshCounter,
    tokenVersion: user.tokenVersion,
  })

  await refreshTokenRepository.create({ token: sha256(newRefreshToken), sessionId: session.id })

  const accessToken = generateAccessToken({
    userId:       user.id,
    email:        user.email,
    tokenVersion: user.tokenVersion,
    sessionId:    session.id,
  })

  logAuditEvent("TOKEN_REFRESHED", {
    userId:    user.id,
    sessionId: session.id,
    ip:        ctx?.ip,
    userAgent: ctx?.userAgent,
    success:   true,
    metadata:  { counter: updatedSession.refreshCounter },
  })

  return { accessToken, refreshToken: newRefreshToken }
}
