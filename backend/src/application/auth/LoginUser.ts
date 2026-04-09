import { userRepository } from "../../infrastructure/repositories/userRepository"
import { comparePassword } from "../../shared/hash"
import { normalizeEmail } from "../../shared/email"
import { generateAccessToken } from "../../infrastructure/jwt"
import { createRefreshToken } from "./CreateRefreshToken"
import { checkLoginBruteForce } from "../security/LoginBruteForceGuard"
import { logAuditEvent } from "../../infrastructure/audit/auditLogger"
import { detectLoginAnomalies } from "../../infrastructure/anomaly/AnomalyDetector"

export async function loginUser({
  email,
  password,
  ip,
  userAgent,
  deviceFingerprint,
}: {
  email: string
  password: string
  ip?: string
  userAgent?: string
  deviceFingerprint?: string
}) {
  const user = await userRepository.findByEmail(normalizeEmail(email))
  if (!user) {
    logAuditEvent("LOGIN_FAILED", {
      ip, userAgent, success: false, metadata: { reason: "user_not_found", email },
    })
    throw new Error("Invalid credentials")
  }

  // Check per-account lockout before touching the password — throws if locked
  await checkLoginBruteForce(user.id, { ip, userAgent })

  const valid = await comparePassword(password, user.passwordHash)
  if (!valid) {
    logAuditEvent("LOGIN_FAILED", {
      ip, userAgent, userId: user.id, success: false, metadata: { reason: "invalid_password" },
    })
    throw new Error("Invalid credentials")
  }

  if (!user.isVerified) {
    logAuditEvent("LOGIN_FAILED", {
      ip, userAgent, userId: user.id, success: false, metadata: { reason: "email_not_verified" },
    })
    throw new Error("Email not verified")
  }

  const anomalies = await detectLoginAnomalies(user.id, { ip, userAgent, deviceFingerprint })

  const { refreshToken, session } = await createRefreshToken(user.id, user.tokenVersion, deviceFingerprint, ip, userAgent)

  const accessToken = generateAccessToken({
    userId:       user.id,
    email:        user.email,
    tokenVersion: user.tokenVersion,
    sessionId:    session.id,
  })

  logAuditEvent("LOGIN_SUCCESS", {
    ip, userAgent,
    userId:    user.id,
    sessionId: session.id,
    success:   true,
    metadata:  anomalies.length ? { anomalies } : undefined,
  })

  return { accessToken, refreshToken }
}
