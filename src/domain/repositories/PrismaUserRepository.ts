import { IUserRepository } from '../../domain/IUserRepository'
import { User } from '../entities/User'
import { prisma } from '../../infrastructure/prisma'

export class PrismaUserRepository implements IUserRepository {

  async findByEmail(email: string): Promise<User | null> {
    const u = await prisma.user.findUnique({ where: { email } })
    if (!u) return null

    return new User(u.id, u.email, u.passwordHash, u.isVerified)
  }

  async create(user: User): Promise<User> {
    const u = await prisma.user.create({
      data: {
        email: user.email,
        passwordHash: user.passwordHash,
        isVerified: user.isVerified,
      },
    })

    return new User(u.id, u.email, u.passwordHash, u.isVerified)
  }

  async markVerified(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
    })
  }
}