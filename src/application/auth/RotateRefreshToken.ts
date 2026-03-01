import { prisma } from "../../infrastructure/prisma"
import { verifyRefreshToken } from "../../infrastructure/jwt"
import { createRefreshToken } from "./CreateRefreshToken"
import { generateAccessToken } from "../../infrastructure/jwt"
import { checkRefreshRotationLimit } from "../security/RefreshRotationRateLimiter"

export async function rotateRefreshToken(oldToken: string) {
  const decoded: any = verifyRefreshToken(oldToken)

  checkRefreshRotationLimit(decoded.userId)

  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: oldToken },
    include: { user: true }
  })

  if (!storedToken || storedToken.revoked) {
    throw new Error("Invalid refresh token")
  }

  await prisma.refreshToken.update({
    where: { token: oldToken },
    data: { revoked: true }
  })

  const { refreshToken } = await createRefreshToken(
    decoded.userId
  )

  const accessToken = generateAccessToken({
    userId: decoded.userId,
    email: storedToken.user.email,
    tokenVersion: storedToken.user.tokenVersion
  })

  return {
    accessToken,
    refreshToken
  }
}