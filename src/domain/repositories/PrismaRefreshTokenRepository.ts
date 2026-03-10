import { prisma } from '../../infrastructure/prisma'
import { RefreshTokenRepository } from './RefreshTokenRepository'

export class PrismaRefreshTokenRepository implements RefreshTokenRepository {

  async findByToken(token: string) {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true }
    })
  }

  async revoke(token: string) {
    await prisma.refreshToken.update({
      where: { token },
      data: { revoked: true }
    })
  }

  async create(
    token: string,
    userId: string,
    sessionId: string,
    expiresAt: Date
  ) {
    await prisma.refreshToken.create({
      data: {
        token,
        userId,
        sessionId,
        expiresAt
      }
    })
  }
}