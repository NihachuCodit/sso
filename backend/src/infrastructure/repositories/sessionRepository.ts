import { prisma } from "../prisma"

export const sessionRepository = {
  create: (data: Parameters<typeof prisma.session.create>[0]["data"]) =>
    prisma.session.create({ data }),

  findById: (id: string) =>
    prisma.session.findUnique({ where: { id } }),

  findByFamilyId: (familyId: string) =>
    prisma.session.findFirst({ where: { familyId } }),

  update: (id: string, data: Parameters<typeof prisma.session.update>[0]["data"]) =>
    prisma.session.update({ where: { id }, data }),

  revokeAllForUser: (userId: string) =>
    prisma.session.updateMany({ where: { userId, revoked: false }, data: { revoked: true } }),
}
