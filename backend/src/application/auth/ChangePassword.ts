import { userRepository } from "../../infrastructure/repositories/userRepository"
import { hashPassword, comparePassword } from "../../shared/hash"
import { checkPasswordStrength } from "../security/PasswordStrength"
import { logAuditEvent } from "../../infrastructure/audit/auditLogger"

export async function changePassword({
  userId,
  currentPassword,
  newPassword,
  ip,
  userAgent,
}: {
  userId: string
  currentPassword: string
  newPassword: string
  ip?: string
  userAgent?: string
}) {
  const user = await userRepository.findWithHistoryById(userId)

  if (!user) throw new Error("User not found")

  const valid = await comparePassword(currentPassword, user.passwordHash)
  if (!valid) throw new Error("Current password is incorrect")

  checkPasswordStrength(newPassword)

  // Reject if newPassword matches any previously stored hash
  for (const entry of user.passwordHistory) {
    const reused = await comparePassword(newPassword, entry.passwordHash)
    if (reused) throw new Error("Password has been used before — choose a different one")
  }

  const newHash = await hashPassword(newPassword)

  // All three writes are atomic: update password, record history, revoke sessions
  await userRepository.changePasswordAtomic(userId, newHash)

  logAuditEvent("PASSWORD_CHANGED", {
    userId,
    ip,
    userAgent,
    success: true,
  })
}
