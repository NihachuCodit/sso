import { Router, Request, Response } from "express"
import { rotateRefreshToken } from "../../../application/auth/RotateRefreshToken"
import { getRefreshCookie, setRefreshCookie, clearRefreshCookie } from "../../../infrastructure/http/refreshCookie"

const router = Router()

router.post("/", async (req: Request, res: Response) => {
  try {
    const token = getRefreshCookie(req)

    if (!token) {
      return res.status(400).json({ error: "Refresh token required" })
    }

    const { accessToken, refreshToken } = await rotateRefreshToken(token, {
      ip:        req.ip,
      userAgent: req.headers["user-agent"] as string | undefined,
    })

    setRefreshCookie(res, refreshToken)
    res.json({ accessToken })

  } catch (err: any) {
    clearRefreshCookie(res)
    res.status(403).json({ error: err.message })
  }
})

export default router
