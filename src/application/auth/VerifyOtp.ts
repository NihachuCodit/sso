import { prisma } from "../../infrastructure/prisma"
import { generateAccessToken, generateRefreshToken } from "../../infrastructure/jwt"

export async function verifyOtp(userId: string, code: string) {

  const otpRecord = await prisma.otp.findFirst({
    where: {
      userId,
      code,
      used: false
    },
    orderBy: {
      createdAt: "desc"
    }
  })

  if (!otpRecord) {
    throw new Error("Invalid OTP")
  }

  if (otpRecord.expiresAt < new Date()) {
    throw new Error("OTP expired")
  }

  // mark OTP used
  await prisma.otp.update({
    where: { id: otpRecord.id },
    data: { used: true }
  })

  // ⭐ verify user
  await prisma.user.update({
    where: { id: userId },
    data: { isVerified: true }
  })

  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user) throw new Error("User not found")

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email
  })

  const refreshToken = generateRefreshToken({
    userId: user.id
  })

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  })

  return {
    accessToken,
    refreshToken
  }
}