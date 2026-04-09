import { prisma } from "../prisma"

export const userRepository = {
  findByEmail: (email: string) =>
    prisma.user.findUnique({ where: { email } }),

  findById: (id: string) =>
    prisma.user.findUnique({ where: { id } }),

  findWithHistoryById: (id: string) =>
    prisma.user.findUnique({
      where:   { id },
      include: { passwordHistory: { orderBy: { createdAt: "desc" } } },
    }),

  findWithHistoryByEmail: (email: string) =>
    prisma.user.findUnique({
      where:   { email },
      include: { passwordHistory: { orderBy: { createdAt: "desc" } } },
    }),

  create: (data: { email: string; passwordHash: string }) =>
    prisma.user.create({
      data: { ...data, isVerified: false },
    }),

  createWithHistory: async (data: { email: string; passwordHash: string }) => {
    const user = await prisma.user.create({
      data: { ...data, isVerified: false },
    })
    await prisma.userPasswordHistory.create({ data: { userId: user.id, passwordHash: data.passwordHash } })
    return user
  },

  update: (id: string, data: Parameters<typeof prisma.user.update>[0]["data"]) =>
    prisma.user.update({ where: { id }, data }),

  // Atomically: update password + tokenVersion, record history, revoke all sessions
  changePasswordAtomic: (userId: string, newHash: string) =>
    prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data:  { passwordHash: newHash, tokenVersion: { increment: 1 } },
      }),
      prisma.userPasswordHistory.create({ data: { userId, passwordHash: newHash } }),
      prisma.session.updateMany({ where: { userId, revoked: false }, data: { revoked: true } }),
    ]),

  // Atomically: update password + isVerified + tokenVersion, record history, revoke all sessions
  resetPasswordAtomic: (userId: string, newHash: string) =>
    prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data:  { passwordHash: newHash, isVerified: true, tokenVersion: { increment: 1 } },
      }),
      prisma.userPasswordHistory.create({ data: { userId, passwordHash: newHash } }),
      prisma.session.updateMany({ where: { userId, revoked: false }, data: { revoked: true } }),
    ]),
}
