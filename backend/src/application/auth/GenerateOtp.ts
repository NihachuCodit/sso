import { otpRepository } from "../../infrastructure/repositories/otpRepository"
import { generateOtp as makeCode } from "../../shared/otp"
import { sha256 } from "../../shared/hash"
import { sendMail } from "../../infrastructure/email/mailer"
import { otpEmailHtml } from "../../infrastructure/email/templates"

export async function generateOtp(userId: string, email: string) {
  const code = makeCode()

  // Atomic: invalidate previous OTPs and create the new one in one transaction
  // to prevent a race where two concurrent requests both produce a valid OTP.
  await otpRepository.invalidateAndCreate(userId, sha256(code), new Date(Date.now() + 5 * 60 * 1000))

  if (process.env.NODE_ENV !== "production") {
    const { devCacheOtp } = await import("../../infrastructure/dev/otpCache")
    devCacheOtp(email, code)
  }

  const hasSmtp   = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD)
  const hasResend = !!process.env.RESEND_API_KEY

  if (hasSmtp || hasResend) {
    await sendMail({
      to:      email,
      subject: "Your verification code",
      html:    otpEmailHtml(code),
    })
  }

  return code
}
