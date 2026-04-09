import { prisma } from "../prisma"
import { Prisma } from "@prisma/client"

export const auditLogRepository = {
  count: (where: Prisma.AuditLogWhereInput) =>
    prisma.auditLog.count({ where }),
}
