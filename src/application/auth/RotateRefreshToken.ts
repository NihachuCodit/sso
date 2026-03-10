import { prisma } from "../../infrastructure/prisma"
import { generateRefreshToken } from "../../infrastructure/jwt"

/**
 * Ротация refresh токена: 
 * старый токен помечается как used, создаётся новый токен для той же сессии
 */
export async function rotateRefreshToken(oldToken: string) {
  // Найти refresh токен и сессию
  const existing = await prisma.refreshToken.findUnique({
    where: { token: oldToken },
    include: { session: true }
  })

  if (!existing) {
    throw new Error("Refresh token not found")
  }

  if (existing.used) {
    throw new Error("Refresh token already used")
  }

  // Пометить старый токен как использованный
  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { used: true }
  })

  // Создать новый токен
  const newToken = generateRefreshToken({
    userId: existing.session.userId,
    sessionId: existing.session.id,
    familyId: existing.session.familyId,
    counter: existing.session.refreshCounter
  })

  const created = await prisma.refreshToken.create({
    data: {
      token: newToken,
      sessionId: existing.session.id,
      used: false
    }
  })

  return {
    accessToken: newToken,   // сразу можно вернуть как accessToken
    refreshToken: created.token
  }
}