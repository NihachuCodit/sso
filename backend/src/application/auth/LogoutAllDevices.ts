import { prisma } from "../../infrastructure/prisma"
import { logAuditEvent } from "../../infrastructure/audit/auditLogger"

export async function logoutAllDevices(
  userId: string,
  ctx?: { ip?: string; userAgent?: string }
) {
  const { count } = await prisma.session.updateMany({
    where: { userId, revoked: false },
    data:  { revoked: true },
  })

  // Increment tokenVersion so all existing access tokens are immediately
  // rejected by authMiddleware on the next request
  await prisma.user.update({
    where: { id: userId },
    data:  { tokenVersion: { increment: 1 } },
  })

  logAuditEvent("LOGOUT_ALL", {
    userId,
    ip:        ctx?.ip,
    userAgent: ctx?.userAgent,
    success:   true,
    metadata:  { sessionsRevoked: count },
  })
}
