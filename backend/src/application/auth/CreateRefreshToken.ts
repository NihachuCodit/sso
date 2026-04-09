import { sessionRepository } from "../../infrastructure/repositories/sessionRepository"
import { refreshTokenRepository } from "../../infrastructure/repositories/refreshTokenRepository"
import { generateRefreshToken } from "../../infrastructure/jwt"
import { sha256 } from "../../shared/hash"
import { v4 as uuid } from "uuid"
import { createHash } from "crypto"

function hashOptional(value?: string): string | null {
  if (!value) return null
  return createHash("sha256").update(value).digest("hex")
}

export async function createRefreshToken(
  userId: string,
  tokenVersion: number,
  deviceFingerprint?: string,
  ip?: string,
  userAgent?: string
) {
  const session = await sessionRepository.create({
    userId,
    familyId: uuid(),
    refreshCounter: 0,
    deviceInfo: {
      deviceFingerprintHash: hashOptional(deviceFingerprint),
      ipHash:                hashOptional(ip),
      userAgentHash:         hashOptional(userAgent),
    },
  })

  const refreshToken = generateRefreshToken({
    userId,
    sessionId:    session.id,
    familyId:     session.familyId,
    counter:      session.refreshCounter,
    tokenVersion,
  })

  // Store SHA-256 hash of the token — raw JWT is never persisted.
  // Lookups use sha256(rawToken) as the key.
  await refreshTokenRepository.create({ token: sha256(refreshToken), sessionId: session.id })

  return { refreshToken, session }
}
