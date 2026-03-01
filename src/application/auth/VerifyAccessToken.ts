import { prisma } from "../../infrastructure/prisma"
import { verifyAccessToken } from "../../infrastructure/jwt"

export async function verifyAccessTokenUseCase(
  token: string
) {
  const decoded: any = verifyAccessToken(token)

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId }
  })

  if (!user) throw new Error("User not found")

  if (user.tokenVersion !== decoded.tokenVersion) {
    throw new Error("Token revoked")
  }

  return decoded
}