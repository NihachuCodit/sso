import { Router, Request, Response } from "express"
import { verifyOtpAndLogin } from "../../../application/auth/VerifyOtpAndLogin"

const router = Router()

router.post("/", async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body

    if (!email || !otp)
      return res.status(400).json({ error: "Email and OTP required" })

    const tokens = await verifyOtpAndLogin({
      email,
      otp,
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    })

    res.json({ message: "OTP verified", ...tokens })

  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

export default router
