import { Router, Request, Response } from "express"
import { verifyOtpAndLogin } from "../../../application/auth/VerifyOtpAndLogin"
import { setRefreshCookie } from "../../../infrastructure/http/refreshCookie"

const router = Router()

router.post("/", async (req: Request, res: Response) => {
  try {
    const { email, otp, deviceFingerprint } = req.body

    if (!email || !otp)
      return res.status(400).json({ error: "Email and OTP required" })

    const { accessToken, refreshToken } = await verifyOtpAndLogin({
      email,
      otp,
      ip:                req.ip,
      userAgent:         req.headers["user-agent"] as string | undefined,
      deviceFingerprint: typeof deviceFingerprint === "string" ? deviceFingerprint : undefined,
    })

    setRefreshCookie(res, refreshToken)
    res.json({ message: "OTP verified", accessToken })

  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

export default router
