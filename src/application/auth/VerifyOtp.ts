import { prisma } from "../../infrastructure/prisma"

export async function verifyOtp(userId: string, otp: string) {
  const otpRecord = await prisma.otp.findFirst({
    where: {
      userId,
      code: otp,
      used: false,
      expiresAt: { gt: new Date() }
    }
  })

  if (!otpRecord) throw new Error("Invalid OTP")

  await prisma.otp.update({ where: { id: otpRecord.id }, data: { used: true } })
}