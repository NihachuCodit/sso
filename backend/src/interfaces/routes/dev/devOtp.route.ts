import { Router, Request, Response } from "express"
import { devConsumeOtp } from "../../../infrastructure/dev/otpCache"

const router = Router()

router.get("/otp", (req: Request, res: Response) => {
  const { email } = req.query

  if (typeof email !== "string" || !email) {
    return res.status(400).json({ error: "email query param required" })
  }

  const otp = devConsumeOtp(email)

  if (!otp) {
    return res.status(404).json({ error: "No pending OTP for this email" })
  }

  res.json({ otp })
})

export default router
