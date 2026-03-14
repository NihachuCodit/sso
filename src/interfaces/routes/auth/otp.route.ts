import { Router, Request, Response } from "express"
import { prisma } from "../../../infrastructure/prisma"
import { generateOtp } from "../../../application/auth/GenerateOtp"
import { sendOtpEmail } from "../../../infrastructure/mailer"

const router = Router()

router.post("/", async (req: Request, res: Response) => {
  try {
    const { email } = req.body

    if (!email)
      return res.status(400).json({ error: "Email required" })

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user)
      return res.status(404).json({ error: "User not found" })

    const code = await generateOtp(user.id)
    await sendOtpEmail(user.email, code)

    res.json({ message: "OTP sent to email" })

  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

export default router
