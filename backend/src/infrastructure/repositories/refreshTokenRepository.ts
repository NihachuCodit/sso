import { prisma } from "../prisma"

export const refreshTokenRepository = {
  findByHash: (tokenHash: string) =>
    prisma.refreshToken.findUnique({ where: { token: tokenHash } }),

  findWithSession: (tokenHash: string) =>
    prisma.refreshToken.findUnique({
      where:   { token: tokenHash },
      include: { session: true },
    }),

  findWithSessionAndUser: (tokenHash: string) =>
    prisma.refreshToken.findUnique({
      where:   { token: tokenHash },
      include: { session: { include: { user: true } } },
    }),

  create: (data: { token: string; sessionId: string }) =>
    prisma.refreshToken.create({ data: { ...data, used: false } }),

  markUsed: (id: string) =>
    prisma.refreshToken.update({ where: { id }, data: { used: true } }),
}
