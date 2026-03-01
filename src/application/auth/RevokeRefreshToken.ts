import { prisma } from "../../infrastructure/prisma"

export async function revokeRefreshToken(token: string) {
  await prisma.refreshToken.update({
    where: { token },
    data: {
      revoked: true
    }
  })
}