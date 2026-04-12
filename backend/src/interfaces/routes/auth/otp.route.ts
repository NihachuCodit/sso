import { Router, Request, Response } from "express"
import { userRepository } from "../../../infrastructure/repositories/userRepository"
import { generateOtp } from "../../../application/auth/GenerateOtp"
import { logAuditEvent } from "../../../infrastructure/audit/auditLogger"
import { normalizeEmail } from "../../../shared/email"

const router = Router()

router.post("/", async (req: Request, res: Response) => {
  try {
    const { email } = req.body

    if (!email)
      return res.status(400).json({ error: "Email required" })

    const normalized = normalizeEmail(email)
    const user = await userRepository.findByEmail(normalized)

    // Always return 200 — do not reveal whether the email is registered
    if (!user)
      return res.json({ message: "If that email is registered you will receive a code" })

    await generateOtp(user.id, normalized)

    logAuditEvent("OTP_REQUESTED", {
      userId:    user.id,
      ip:        req.ip,
      userAgent: req.headers["user-agent"] as string | undefined,
      success:   true,
    })

    res.json({ message: "OTP sent to email" })

  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

export default router
