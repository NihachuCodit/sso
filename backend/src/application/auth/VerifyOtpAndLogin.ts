import { userRepository } from "../../infrastructure/repositories/userRepository"
import { generateAccessToken } from "../../infrastructure/jwt"
import { normalizeEmail } from "../../shared/email"
import { createRefreshToken } from "./CreateRefreshToken"
import { verifyOtpWithBruteForceGuard } from "../security/OtpBruteForceGuard"
import { logAuditEvent } from "../../infrastructure/audit/auditLogger"
import { detectLoginAnomalies } from "../../infrastructure/anomaly/AnomalyDetector"

export async function verifyOtpAndLogin({
  email,
  otp,
  ip,
  userAgent,
  deviceFingerprint,
}: {
  email: string
  otp: string
  ip?: string
  userAgent?: string
  deviceFingerprint?: string
}) {
  const user = await userRepository.findByEmail(normalizeEmail(email))
  if (!user) throw new Error("User not found")

  try {
    await verifyOtpWithBruteForceGuard(user.id, otp)
  } catch (e: any) {
    const isBruteForce = e.message.includes("Too many attempts")
    logAuditEvent(isBruteForce ? "OTP_BRUTE_FORCE" : "OTP_FAILED", {
      ip, userAgent, userId: user.id, success: false, metadata: { reason: e.message },
    })
    throw e
  }

  if (!user.isVerified) {
    await userRepository.update(user.id, { isVerified: true })
  }

  const anomalies = await detectLoginAnomalies(user.id, { ip, userAgent, deviceFingerprint })

  const { refreshToken, session } = await createRefreshToken(user.id, user.tokenVersion, deviceFingerprint, ip, userAgent)

  const accessToken = generateAccessToken({
    userId:       user.id,
    email:        user.email,
    tokenVersion: user.tokenVersion,
    sessionId:    session.id,
  })

  logAuditEvent("OTP_VERIFIED", {
    ip, userAgent,
    userId:    user.id,
    sessionId: session.id,
    success:   true,
    metadata:  anomalies.length ? { anomalies } : undefined,
  })

  return { accessToken, refreshToken }
}
