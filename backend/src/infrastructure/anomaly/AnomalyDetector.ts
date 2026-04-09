import { AuditEventType, Prisma } from "@prisma/client"
import { createHash } from "crypto"
import { prisma } from "../prisma"
import { logAuditEvent } from "../audit/auditLogger"

export type AnomalyType =
  | "NEW_DEVICE"
  | "NEW_IP"
  | "RAPID_LOGIN"
  | "EXCESSIVE_SESSIONS"
  | "FINGERPRINT_CHANGED"

// Thresholds
const RAPID_LOGIN_WINDOW_MS = 5 * 60 * 1000  // 5 minutes
const RAPID_LOGIN_THRESHOLD = 3              // logins within window
const EXCESSIVE_SESSIONS_THRESHOLD = 5       // concurrent active sessions

const ANOMALY_EVENT: Record<AnomalyType, AuditEventType> = {
  NEW_DEVICE:           "ANOMALY_NEW_DEVICE",
  NEW_IP:               "ANOMALY_NEW_IP",
  RAPID_LOGIN:          "ANOMALY_RAPID_LOGIN",
  EXCESSIVE_SESSIONS:   "ANOMALY_EXCESSIVE_SESSIONS",
  FINGERPRINT_CHANGED:  "ANOMALY_FINGERPRINT_CHANGED",
}

// Successful login event types used as baseline for anomaly comparisons
const LOGIN_SUCCESS_EVENTS: AuditEventType[] = ["LOGIN_SUCCESS", "OTP_VERIFIED"]

/**
 * Runs all anomaly checks for a login attempt.
 * Detected anomalies are logged as audit events and returned.
 * Never throws — failures are swallowed so auth flow is never blocked.
 */
export async function detectLoginAnomalies(
  userId: string,
  ctx: { ip?: string; userAgent?: string; deviceFingerprint?: string }
): Promise<AnomalyType[]> {
  try {
    const [newDevice, newIp, rapidLogin, excessiveSessions, fingerprintChanged] = await Promise.all([
      checkNewDevice(userId, ctx.userAgent),
      checkNewIp(userId, ctx.ip),
      checkRapidLogin(userId),
      checkExcessiveSessions(userId),
      checkFingerprintChanged(userId, ctx.deviceFingerprint),
    ])

    const detected: AnomalyType[] = []
    if (newDevice)          detected.push("NEW_DEVICE")
    if (newIp)              detected.push("NEW_IP")
    if (rapidLogin)         detected.push("RAPID_LOGIN")
    if (excessiveSessions)  detected.push("EXCESSIVE_SESSIONS")
    if (fingerprintChanged) detected.push("FINGERPRINT_CHANGED")

    for (const anomaly of detected) {
      logAuditEvent(ANOMALY_EVENT[anomaly], {
        userId,
        ip:        ctx.ip,
        userAgent: ctx.userAgent,
        success:   false,
        metadata:  { anomalyType: anomaly },
      })
    }

    return detected
  } catch (e) {
    console.error("[AnomalyDetector] check failed:", e)
    return []
  }
}

/**
 * True when the user-agent has never appeared in this user's successful logins.
 * Silent on first-ever login (no baseline → no alert).
 */
async function checkNewDevice(userId: string, userAgent?: string): Promise<boolean> {
  if (!userAgent) return false

  const baseline = await prisma.auditLog.count({
    where: { userId, eventType: { in: LOGIN_SUCCESS_EVENTS } },
  })
  if (baseline === 0) return false

  const known = await prisma.auditLog.findFirst({
    where: { userId, eventType: { in: LOGIN_SUCCESS_EVENTS }, userAgent },
    select: { id: true },
  })
  return known === null
}

/**
 * True when the IP address has never appeared in this user's successful logins.
 * Silent on first-ever login.
 */
async function checkNewIp(userId: string, ip?: string): Promise<boolean> {
  if (!ip) return false

  const baseline = await prisma.auditLog.count({
    where: { userId, eventType: { in: LOGIN_SUCCESS_EVENTS } },
  })
  if (baseline === 0) return false

  const known = await prisma.auditLog.findFirst({
    where: { userId, eventType: { in: LOGIN_SUCCESS_EVENTS }, ip },
    select: { id: true },
  })
  return known === null
}

/**
 * True when the user has logged in >= RAPID_LOGIN_THRESHOLD times
 * within RAPID_LOGIN_WINDOW_MS. Catches credential sharing / stuffing.
 */
async function checkRapidLogin(userId: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - RAPID_LOGIN_WINDOW_MS)
  const count = await prisma.auditLog.count({
    where: {
      userId,
      eventType: { in: LOGIN_SUCCESS_EVENTS },
      createdAt: { gte: windowStart },
    },
  })
  return count >= RAPID_LOGIN_THRESHOLD
}

/**
 * True when the user already has >= EXCESSIVE_SESSIONS_THRESHOLD active sessions.
 * Indicates account sharing or session accumulation without logout.
 */
async function checkExcessiveSessions(userId: string): Promise<boolean> {
  const count = await prisma.session.count({
    where: { userId, revoked: false },
  })
  return count >= EXCESSIVE_SESSIONS_THRESHOLD
}

/**
 * True when the device fingerprint differs from the last session's stored fingerprint.
 * Requires fingerprint to be present in both the current request and the previous session.
 * Skips comparison if the stored hash looks like a bcrypt hash (legacy data).
 */
async function checkFingerprintChanged(userId: string, deviceFingerprint?: string): Promise<boolean> {
  if (!deviceFingerprint) return false

  const lastSession = await prisma.session.findFirst({
    where: { userId, deviceInfo: { not: Prisma.JsonNull } },
    orderBy: { createdAt: "desc" },
    select: { deviceInfo: true },
  })

  if (!lastSession?.deviceInfo) return false

  const info = lastSession.deviceInfo as { deviceFingerprintHash?: string | null }
  const stored = info.deviceFingerprintHash
  if (!stored) return false

  // Skip legacy bcrypt hashes — they can't be compared deterministically
  if (stored.startsWith("$2b$") || stored.startsWith("$2a$")) return false

  const current = createHash("sha256").update(deviceFingerprint).digest("hex")
  return current !== stored
}
