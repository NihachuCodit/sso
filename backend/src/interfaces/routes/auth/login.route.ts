import { Router } from "express"
import { loginUser } from "../../../application/auth/LoginUser"
import { setRefreshCookie } from "../../../infrastructure/http/refreshCookie"

const router = Router()

router.post("/", async (req, res) => {
  try {
    const { email, password, deviceFingerprint } = req.body
    const { accessToken, refreshToken } = await loginUser({
      email,
      password,
      ip:                req.ip,
      userAgent:         req.headers["user-agent"] as string | undefined,
      deviceFingerprint: typeof deviceFingerprint === "string" ? deviceFingerprint : undefined,
    })
    setRefreshCookie(res, refreshToken)
    res.json({ accessToken })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

export default router
