import { prisma } from "../../infrastructure/prisma"
import { generateRefreshToken } from "../../infrastructure/jwt"
import { v4 as uuid } from "uuid"
import { hash } from "bcrypt"

async function hashValue(value?: string) {
  if (!value) return null
  return hash(value, 10)
}

export async function createRefreshToken(
  userId: string,
  deviceFingerprint?: string,
  ip?: string,
  userAgent?: string
) {

  const deviceFingerprintHash = await hashValue(deviceFingerprint)
  const ipHash = await hashValue(ip)
  const userAgentHash = await hashValue(userAgent)

  // создаём сессию
  const session = await prisma.session.create({
    data: {
      userId,
      familyId: uuid(),
      refreshCounter: 0,

      deviceInfo: {
        deviceFingerprintHash,
        ipHash,
        userAgentHash
      }
    }
  })

  // генерируем токен
  const refreshToken = generateRefreshToken({
    userId,
    sessionId: session.id,
    familyId: session.familyId,
    counter: session.refreshCounter
  })

  // сохраняем refresh токен в БД
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      sessionId: session.id,
      used: false,
      createdAt: new Date(),
    }
  })

  return {
    refreshToken,
    session
  }
}