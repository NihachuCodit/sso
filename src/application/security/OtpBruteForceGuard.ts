import { prisma } from "../../infrastructure/prisma"

export async function checkOtpAttempts(userId: string) {
  const otp = await prisma.otp.findFirst({
    where: {
      userId,
      used: false
    },
    orderBy: {
      createdAt: "desc"
    }
  })

  if (!otp) return

  if (otp.attempts >= 5) {
    throw new Error("Too many OTP attempts")
  }
}