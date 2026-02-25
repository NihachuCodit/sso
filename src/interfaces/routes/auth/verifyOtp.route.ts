import { Router, Request, Response } from "express"
import { verifyOtp } from "../../../application/auth/VerifyOtp"
import { prisma } from "../../../infrastructure/prisma"

const router = Router()

router.post("/", async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body

    if (!email || !otp) {
      return res.status(400).json({
        error: "Email and OTP required"
      })
    }

    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return res.status(404).json({
        error: "User not found"
      })
    }

    await verifyOtp(user.id, otp)

    return res.json({
      message: "OTP verified successfully"
    })

  } catch (err: any) {
    return res.status(400).json({
      error: err.message
    })
  }
})

export default router