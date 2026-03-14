import { prisma } from "../../infrastructure/prisma"

/**
 * Logs out a user by revoking their session.
 * All refresh tokens for the session become invalid on next rotation attempt.
 */
export async function logoutUser(refreshToken: string) {
  const token = await prisma.refreshToken.findUnique({
    where: { token: refreshToken }
  })

  if (!token) throw new Error("Token not found")

  await prisma.session.update({
    where: { id: token.sessionId },
    data: { revoked: true }
  })

  await prisma.refreshToken.update({
    where: { id: token.id },
    data: { used: true }
  })
}
