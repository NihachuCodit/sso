import { userRepository } from "../../infrastructure/repositories/userRepository"
import { hashPassword, comparePassword } from "../../shared/hash"
import { normalizeEmail } from "../../shared/email"
import { checkPasswordStrength } from "../security/PasswordStrength"
import { verifyOtpWithBruteForceGuard } from "../security/OtpBruteForceGuard"
import { logAuditEvent } from "../../infrastructure/audit/auditLogger"

export async function resetPassword({
  email,
  otp,
  newPassword,
  ip,
  userAgent,
}: {
  email: string
  otp: string
  newPassword: string
  ip?: string
  userAgent?: string
}) {
  const user = await userRepository.findWithHistoryByEmail(normalizeEmail(email))

  if (!user) throw new Error("User not found")

  // Verify OTP — throws on bad code, expiry, or brute force
  await verifyOtpWithBruteForceGuard(user.id, otp)

  checkPasswordStrength(newPassword)

  // Reject if newPassword matches any previously stored hash
  for (const entry of user.passwordHistory) {
    const reused = await comparePassword(newPassword, entry.passwordHash)
    if (reused) throw new Error("Password has been used before — choose a different one")
  }

  const newHash = await hashPassword(newPassword)

  // Atomic: update password, bump tokenVersion, record history, revoke all sessions
  await userRepository.resetPasswordAtomic(user.id, newHash)

  logAuditEvent("PASSWORD_RESET", {
    userId:   user.id,
    ip,
    userAgent,
    success:  true,
  })
}
