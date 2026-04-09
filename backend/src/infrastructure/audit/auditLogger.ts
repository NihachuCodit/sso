import { AuditEventType } from "@prisma/client"
import { prisma } from "../prisma"

export interface AuditContext {
  userId?: string | null
  sessionId?: string | null
  ip?: string | null
  userAgent?: string | null
  success: boolean
  metadata?: Record<string, unknown>
}

/**
 * Fire-and-forget audit event writer.
 * Never throws — failures are logged to stderr only.
 */
export function logAuditEvent(
  eventType: AuditEventType,
  context: AuditContext
): void {
  prisma.auditLog
    .create({
      data: {
        eventType,
        userId:    context.userId    ?? null,
        sessionId: context.sessionId ?? null,
        ip:        context.ip        ?? null,
        userAgent: context.userAgent ?? null,
        success:   context.success,
        metadata:  context.metadata ? (context.metadata as object) : undefined,
      },
    })
    .catch((e) => {
      console.error("[AuditLog] Failed to write audit event:", eventType, e)
    })
}
