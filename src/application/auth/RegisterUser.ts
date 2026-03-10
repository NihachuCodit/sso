import { prisma } from "../../infrastructure/prisma"
import { hashPassword } from "../../shared/hash"
import { checkPasswordStrength } from "../security/PasswordStrength"

export async function registerUser({
  email,
  password
}: {
  email: string
  password: string
}) {
  if (!email || !password) {
    throw new Error("Email and password are required")
  }

  // Проверка силы пароля
  checkPasswordStrength(password)

  // Проверяем, существует ли пользователь
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw new Error("User already exists")
  }

  // Хэшируем пароль через hashPassword
  const passwordHash = await hashPassword(password)

  // Создаём пользователя
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      isVerified: false
    }
  })

  // Добавляем в историю паролей
  await prisma.userPasswordHistory.create({
    data: {
      userId: user.id,
      passwordHash
    }
  })

  return user
}