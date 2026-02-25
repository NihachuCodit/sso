import { Router, Request, Response } from "express"

import { generateOtp } from "../../../application/auth/GenerateOtp"
import { checkOtpAttempts } from "../../../application/security/OtpBruteForceGuard"
import { otpRateLimiter } from "../../../shared/security/rateLimiter"
import { prisma } from "../../../infrastructure/prisma"

const router = Router()

router.post("/", otpRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: "Email required" })
    }

    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    await checkOtpAttempts(user.id)

    const otp = await generateOtp(user.id)

    res.json({ otp })

  } catch (err: any) {
    res.status(400).json({
      error: err.message
    })
  }
})

export default router