import { prisma } from "../prisma"

export const otpRepository = {
  findActive: (userId: string) =>
    prisma.otp.findFirst({
      where:   { userId, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),

  incrementAttempts: (id: string) =>
    prisma.otp.update({ where: { id }, data: { attempts: { increment: 1 } } }),

  markUsed: (id: string) =>
    prisma.otp.update({ where: { id }, data: { used: true } }),

  // Atomically: invalidate all active OTPs then create a fresh one
  invalidateAndCreate: (userId: string, codeHash: string, expiresAt: Date) =>
    prisma.$transaction([
      prisma.otp.updateMany({ where: { userId, used: false }, data: { used: true } }),
      prisma.otp.create({ data: { userId, code: codeHash, expiresAt } }),
    ]),
}
