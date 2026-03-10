import { Router, Request, Response } from "express"
import { prisma } from "../../../infrastructure/prisma"

const router = Router()

router.post("/", async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(400).json({
        error: "Refresh token required"
      })
    }

    // помечаем токен как использованный
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { used: true }
    })

    return res.json({
      message: "Logged out successfully"
    })

  } catch {
    return res.status(500).json({
      error: "Logout failed"
    })
  }
})

export default router