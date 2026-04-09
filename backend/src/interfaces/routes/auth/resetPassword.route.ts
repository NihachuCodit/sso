import { Router, Request, Response } from "express"
import { resetPassword } from "../../../application/auth/ResetPassword"

const router = Router()

// The OTP is requested separately via POST /auth/otp.
// This endpoint consumes the OTP and sets the new password atomically.
router.post("/", async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body

    if (!email || !otp || !newPassword)
      return res.status(400).json({ error: "email, otp, and newPassword are required" })

    await resetPassword({
      email,
      otp,
      newPassword,
      ip:        req.ip,
      userAgent: req.headers["user-agent"] as string | undefined,
    })

    res.json({ message: "Password reset — please log in with your new password" })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

export default router
