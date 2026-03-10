import { prisma } from "../../infrastructure/prisma"
import { compare } from "bcrypt"

const MAX_ATTEMPTS = 5
const WINDOW_MINUTES = 5

/**
 * Проверка OTP с безопасностью:
 * - fake hash comparison если OTP не найден
 * - лимит попыток (rate limit)
 * - подсчет попыток
 * @param userId ID пользователя
 * @param code введённый код OTP
 */
export async function verifyOtpWithSecurity(
  userId: string,
  code: string
) {
  // Находим последний OTP для пользователя
  const otpRecord = await prisma.otp.findFirst({
    where: { userId, used: false },
    orderBy: { createdAt: "desc" }
  })

  // Fake comparison для защиты от timing attack
  if (!otpRecord) {
    await compare(code, "$2b$10$invalidhashinvalidhashinv")
    throw new Error("Invalid OTP")
  }

  // Rate limiting: проверка окна времени
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000)
  if (otpRecord.attempts >= MAX_ATTEMPTS && otpRecord.createdAt > windowStart) {
    throw new Error("Too many attempts, try later")
  }

  // Проверяем код OTP
  const valid = await compare(code, otpRecord.code)
  if (!valid) {
    // Увеличиваем счётчик попыток
    await prisma.otp.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } }
    })
    throw new Error("Invalid OTP")
  }

  // Проверка срока действия
  if (otpRecord.expiresAt < new Date()) {
    throw new Error("OTP expired")
  }

  // Метим OTP как использованный
  await prisma.otp.update({
    where: { id: otpRecord.id },
    data: { used: true }
  })

  return otpRecord
}