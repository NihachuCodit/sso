import { Router, Request, Response } from "express"
import { logoutUser } from "../../../application/auth/LogoutUser"
import { getRefreshCookie, clearRefreshCookie } from "../../../infrastructure/http/refreshCookie"

const router = Router()

router.post("/", async (req: Request, res: Response) => {
  try {
    const token = getRefreshCookie(req)

    if (!token)
      return res.status(400).json({ error: "Refresh token required" })

    await logoutUser(token, {
      ip:        req.ip,
      userAgent: req.headers["user-agent"] as string | undefined,
    })

    clearRefreshCookie(res)
    res.json({ message: "Logged out successfully" })

  } catch (err: any) {
    clearRefreshCookie(res)
    res.status(400).json({ error: err.message })
  }
})

export default router
