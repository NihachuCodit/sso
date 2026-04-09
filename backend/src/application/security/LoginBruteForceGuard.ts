import { auditLogRepository } from "../../infrastructure/repositories/auditLogRepository"
import { logAuditEvent } from "../../infrastructure/audit/auditLogger"

const MAX_FAILURES = 10
const WINDOW_MS    = 15 * 60 * 1000 // 15 minutes

/**
 * Throws if the user has exceeded the failed-login threshold within the
 * rolling window. Must be called after the user record is found (requires
 * userId) but before password comparison.
 *
 * Logs LOGIN_LOCKED on each blocked attempt so the event appears in the
 * audit trail and anomaly CLI without needing a separate query.
 */
export async function checkLoginBruteForce(
  userId: string,
  ctx?: { ip?: string; userAgent?: string }
): Promise<void> {
  const windowStart = new Date(Date.now() - WINDOW_MS)

  const failures = await auditLogRepository.count({
    userId,
    eventType: "LOGIN_FAILED",
    success:   false,
    createdAt: { gte: windowStart },
  })

  if (failures >= MAX_FAILURES) {
    logAuditEvent("LOGIN_LOCKED", {
      userId,
      ip:        ctx?.ip,
      userAgent: ctx?.userAgent,
      success:   false,
      metadata:  { failureCount: failures, windowMs: WINDOW_MS },
    })
    throw new Error("Account temporarily locked — too many failed login attempts")
  }
}
