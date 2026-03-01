import { prisma } from "../../infrastructure/prisma"
import { verifyRefreshToken } from "../../infrastructure/jwt"

export async function verifyRefreshTokenService(token: string) {
  const payload: any = verifyRefreshToken(token)

  const storedToken = await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true }
  })

  if (!storedToken) {
    throw new Error("Token not found")
  }

  if (storedToken.revoked) {
    throw new Error("Token revoked")
  }

  if (storedToken.expiresAt < new Date()) {
    throw new Error("Token expired")
  }

  return {
    payload,
    storedToken
  }
}