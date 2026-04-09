import { Router, Response } from "express"
import { authMiddleware, AuthRequest } from "../../../infrastructure/middleware/authMiddleware"
import { changePassword } from "../../../application/auth/ChangePassword"

const router = Router()

router.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: "currentPassword and newPassword are required" })

    await changePassword({
      userId:          req.user!.userId,
      currentPassword,
      newPassword,
      ip:              req.ip,
      userAgent:       req.headers["user-agent"] as string | undefined,
    })

    res.json({ message: "Password changed — please log in again" })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

export default router
