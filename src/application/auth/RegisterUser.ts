import { prisma } from "../../infrastructure/prisma"
import { hash } from "bcrypt"

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

  const existing = await prisma.user.findUnique({
    where: { email }
  })

  if (existing) {
    throw new Error("User already exists")
  }

  const passwordHash = await hash(password, 10)

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      isVerified: false
    }
  })

  return user
}