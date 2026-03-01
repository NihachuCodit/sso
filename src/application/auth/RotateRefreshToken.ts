import {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken
} from "../../infrastructure/jwt"

import { prisma } from "../../infrastructure/prisma"

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

  // revoke old token
  await prisma.refreshToken.update({
    where: { token: oldRefreshToken },
    data: { revoked: true }
  })

  // generate new tokens
  const newAccessToken = generateAccessToken({
    userId: payload.userId,
    email: storedToken.user.email
  })

  // Generate refresh token with uniqueness protection
  let newRefreshToken: string | null = null
  let savedToken = null
  let attempts = 0

  while (!savedToken && attempts < 5) {
    try {
      newRefreshToken = generateRefreshToken({
        userId: payload.userId
      })

      savedToken = await prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: payload.userId,
          expiresAt: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          )
        }
      })
    } catch (e: any) {
      // Prisma unique violation = retry token generation
      if (e.code !== "P2002") throw e
      attempts++
    }
  }

  if (!savedToken || !newRefreshToken) {
    throw new Error("Could not rotate refresh token")
  }

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken
  }
}