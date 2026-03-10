import { prisma } from "../../infrastructure/prisma"
import { comparePassword } from "../../shared/hash"
import { generateAccessToken } from "../../infrastructure/jwt"
import { createRefreshToken } from "./CreateRefreshToken"

export async function loginUser({
  email,
  password
}: {
  email: string
  password: string
}) {

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    throw new Error("Invalid credentials")
  }

  const valid = await comparePassword(password, user.passwordHash)

  if (!valid) {
    throw new Error("Invalid credentials")
  }

  if (!user.isVerified) {
    throw new Error("Email not verified")
  }

  const { refreshToken, session } = await createRefreshToken(user.id)

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    tokenVersion: user.tokenVersion,
    sessionId: session.id
  })

  return {
    accessToken,
    refreshToken
  }
}