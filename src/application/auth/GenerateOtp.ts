import { prisma } from "../../infrastructure/prisma"

export async function generateOtp(userId: string) {

  // Деактивируем все предыдущие неиспользованные OTP
  await prisma.otp.updateMany({
    where: {
      userId,
      used: false
    },
    data: {
      used: true
    }
  })

  // Генерируем 6-значный код
  const code = Math.floor(100000 + Math.random() * 900000).toString()

  // Создаём новый OTP
  const otp = await prisma.otp.create({
    data: {
      userId,
      code,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 минут
    }
  })

  return otp.code
}