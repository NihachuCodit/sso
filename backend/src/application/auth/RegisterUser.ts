import { userRepository } from "../../infrastructure/repositories/userRepository"
import { hashPassword } from "../../shared/hash"
import { normalizeEmail, validateEmail } from "../../shared/email"
import { checkPasswordStrength } from "../security/PasswordStrength"
import { logAuditEvent } from "../../infrastructure/audit/auditLogger"

export async function registerUser({
  email,
  password,
  ip,
  userAgent,
}: {
  email: string
  password: string
  ip?: string
  userAgent?: string
}) {
  if (!email || !password) {
    throw new Error("Email and password are required")
  }

  const normalizedEmail = normalizeEmail(email)
  validateEmail(normalizedEmail)
  checkPasswordStrength(password)

  const existing = await userRepository.findByEmail(normalizedEmail)
  if (existing?.isVerified) {
    throw new Error("User already exists")
  }

  const passwordHash = await hashPassword(password)

  let user
  if (existing) {
    // Unverified user re-registering — update their password and let them retry OTP
    user = await userRepository.update(existing.id, { passwordHash })
  } else {
    user = await userRepository.createWithHistory({ email: normalizedEmail, passwordHash })
  }

  logAuditEvent("USER_REGISTERED", {
    ip,
    userAgent,
    userId: user.id,
    success: true,
    metadata: { email },
  })

  return user
}
