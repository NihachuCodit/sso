import { prisma } from "../../infrastructure/prisma"

export async function generateOtp(userId: string) {
  await prisma.otp.updateMany({
    where: { userId, used: false },
    data: { used: true }
  })

  const code = Math.floor(100000 + Math.random() * 900000).toString()

  await prisma.otp.create({
    data: { userId, code, expiresAt: new Date(Date.now() + 5 * 60 * 1000) }
  })

  return code
}