import { prisma } from "../../infrastructure/prisma"
import { generateAccessToken, generateRefreshToken } from "../../infrastructure/jwt"

/**
 * Rotates a refresh token:
 * - marks the old token as used
 * - creates a new refresh token for the same session
 * - generates a fresh access token
 */
export async function rotateRefreshToken(oldToken: string) {
  const existing = await prisma.refreshToken.findUnique({
    where: { token: oldToken },
    include: {
      session: {
        include: { user: true }
      }
    }
  })

  if (!existing) {
    throw new Error("Refresh token not found")
  }

  if (existing.used) {
    // Token reuse detected — revoke entire session (token family compromise)
    await prisma.session.update({
      where: { id: existing.sessionId },
      data: { revoked: true }
    })
    throw new Error("Refresh token already used — session revoked")
  }

  if (existing.session.revoked) {
    throw new Error("Session has been revoked")
  }

  const { session } = existing
  const { user } = session

  // Mark old token as used
  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { used: true }
  })

  // Increment counter and update lastUsedAt
  const updatedSession = await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshCounter: { increment: 1 },
      lastUsedAt: new Date()
    }
  })

  const newRefreshToken = generateRefreshToken({
    userId: user.id,
    sessionId: session.id,
    familyId: session.familyId,
    counter: updatedSession.refreshCounter
  })

  await prisma.refreshToken.create({
    data: {
      token: newRefreshToken,
      sessionId: session.id,
      used: false
    }
  })

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    tokenVersion: user.tokenVersion,
    sessionId: session.id
  })

  return { accessToken, refreshToken: newRefreshToken }
}
