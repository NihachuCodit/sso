import { prisma } from "../../infrastructure/prisma"

const MAX_ATTEMPTS = 5
const WINDOW_MS = 5 * 60 * 1000

/**
 * Finds the latest unused OTP for a user and validates:
 * - existence (timing-safe: slow path even when not found)
 * - attempt limit within the rolling window
 * - expiry
 * - code match
 *
 * Increments attempt counter on wrong code.
 * Marks OTP as used on success.
 */
export async function verifyOtpWithBruteForceGuard(
  userId: string,
  code: string
) {
  const otpRecord = await prisma.otp.findFirst({
    where: { userId, used: false },
    orderBy: { createdAt: "desc" }
  })

  // Constant-time-ish delay when OTP not found to prevent user enumeration
  if (!otpRecord) {
    await new Promise(r => setTimeout(r, 100))
    throw new Error("Invalid OTP")
  }

  const windowStart = new Date(Date.now() - WINDOW_MS)
  if (otpRecord.attempts >= MAX_ATTEMPTS && otpRecord.createdAt > windowStart) {
    throw new Error("Too many attempts, please request a new OTP")
  }

  if (otpRecord.expiresAt < new Date()) {
    throw new Error("OTP expired")
  }

  if (otpRecord.code !== code) {
    await prisma.otp.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } }
    })
    throw new Error("Invalid OTP")
  }

  await prisma.otp.update({
    where: { id: otpRecord.id },
    data: { used: true }
  })

  return otpRecord
}
