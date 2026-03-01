import { prisma } from "../../../infrastructure/prisma"

export class RefreshTokenFamilyService {

  async revokeFamily(userId: string) {
    await prisma.refreshToken.updateMany({
      where: {
        userId,
        revoked: false
      },
      data: {
        revoked: true
      }
    })
  }

  async cleanupExpired() {
    await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    })
  }
}