import { Router, Response } from "express"
import { authMiddleware, AuthRequest } from "../../../infrastructure/middleware/authMiddleware"
import { logoutAllDevices } from "../../../application/auth/LogoutAllDevices"

const router = Router()

router.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await logoutAllDevices(req.user!.userId, {
      ip:        req.ip,
      userAgent: req.headers["user-agent"] as string | undefined,
    })
    res.json({ message: "All sessions revoked" })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

export default router
