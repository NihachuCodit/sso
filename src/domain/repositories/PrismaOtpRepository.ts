import { IOtpRepository } from '../../domain/IOtpRepository'
import { prisma } from '../../infrastructure/prisma'

export class PrismaOtpRepository implements IOtpRepository {

  async createOtp(userId: string, code: string, expiresAt: Date): Promise<void> {
    await prisma.otp.create({
      data: { userId, code, expiresAt }
    })
  }

  async validateOtp(userId: string, code: string): Promise<boolean> {
    const otp = await prisma.otp.findFirst({
      where: { userId, code },
      orderBy: { expiresAt: 'desc' }
    })

    if (!otp) return false
    if (new Date() > otp.expiresAt) return false

    return true
  }
}