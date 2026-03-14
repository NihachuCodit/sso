import { prisma } from "../../infrastructure/prisma"
import { generateAccessToken } from "../../infrastructure/jwt"
import { createRefreshToken } from "./CreateRefreshToken"
import { verifyOtpWithBruteForceGuard } from "../security/OtpBruteForceGuard"

export async function verifyOtpAndLogin({
  email,
  otp,
  ip,
  userAgent
}: {
  email: string
  otp: string
  ip?: string
  userAgent?: string
}) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw new Error("User not found")

  await verifyOtpWithBruteForceGuard(user.id, otp)

  await prisma.user.update({
    where: { id: user.id },
    data: { isVerified: true }
  })

  const { refreshToken, session } = await createRefreshToken(user.id, undefined, ip, userAgent)

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    tokenVersion: user.tokenVersion,
    sessionId: session.id
  })

  return { accessToken, refreshToken }
}
