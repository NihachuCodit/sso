import { prisma } from "../../infrastructure/prisma"
import { generateOtp as makeCode } from "../../shared/otp"

export async function generateOtp(userId: string) {
  // Invalidate any existing unused OTPs for this user
  await prisma.otp.updateMany({
    where: { userId, used: false },
    data: { used: true }
  })

  const code = makeCode()

  await prisma.otp.create({
    data: { userId, code, expiresAt: new Date(Date.now() + 5 * 60 * 1000) }
  })

  return code
}
