import { prisma } from "../../infrastructure/prisma"
import { generateRefreshToken } from "../../infrastructure/jwt"

export async function createRefreshToken(
  userId: string
) {
  let refreshToken: string

  for (let attempts = 0; attempts < 5; attempts++) {
    try {
      refreshToken = generateRefreshToken({
        userId
      })

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId,
          expiresAt: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          )
        }
      })

      return { refreshToken }

    } catch (e: any) {
      if (e.code !== "P2002") throw e
    }
  }

  throw new Error("Refresh token creation failed")
}