import { verifyRefreshToken, generateAccessToken, generateRefreshToken } from "../../infrastructure/jwt"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function rotateRefreshToken(oldRefreshToken: string) {
  const payload: any = verifyRefreshToken(oldRefreshToken)

  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: oldRefreshToken },
    include: { user: true }
  })

  if (!storedToken || storedToken.revoked) {
    throw new Error("Invalid refresh token")
  }

  if (storedToken.expiresAt < new Date()) {
    throw new Error("Refresh token expired")
  }

  await prisma.refreshToken.update({
    where: { token: oldRefreshToken },
    data: { revoked: true }
  })

  const newAccessToken = generateAccessToken({
    userId: payload.userId,
    email: storedToken.user.email
  })

  const newRefreshToken = generateRefreshToken({
    userId: payload.userId
  })

  await prisma.refreshToken.create({
    data: {
      token: newRefreshToken,
      userId: payload.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  })

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken
  }
}