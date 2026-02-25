import { prisma } from '../../infrastructure/prisma'
import { RefreshTokenRepository } from '../../domain/repositories/RefreshTokenRepository'

export class PrismaRefreshTokenRepository implements RefreshTokenRepository {

  async findByToken(token: string) {
    return prisma.refreshToken.findUnique({
      where: { token }
    })
  }

  async revoke(token: string) {
    await prisma.refreshToken.update({
      where: { token },
      data: { revoked: true }
    })
  }

  async create(token: string, userId: string, expiresAt: Date) {
    await prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt
      }
    })
  }
}