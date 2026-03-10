import { Router, Request, Response } from "express"
import { prisma } from "../../../infrastructure/prisma"
import { generateAccessToken } from "../../../infrastructure/jwt"
import { createRefreshToken } from "../../../application/auth/CreateRefreshToken"

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

    const otpRecord = await prisma.otp.findFirst({
      where: {
        userId: user.id,
        code: otp,
        used: false,
        expiresAt: {
          gt: new Date()
        }
      }
    })

    if (!otpRecord) {
      return res.status(400).json({
        error: "Invalid OTP"
      })
    }

    await prisma.otp.update({
      where: { id: otpRecord.id },
      data: {
        used: true
      }
    })

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true
      }
    })

    const ip = req.ip
    const userAgent = req.headers["user-agent"] as string | undefined

    const { refreshToken, session } =
      await createRefreshToken(
        user.id,
        undefined,
        ip,
        userAgent
      )

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      tokenVersion: user.tokenVersion,
      sessionId: session.id
    })

    res.json({
      message: "OTP verified",
      accessToken,
      refreshToken
    })

  } catch (err: any) {

    res.status(400).json({
      error: err.message
    })

  }

})

export default router