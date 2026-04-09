import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

// In sandbox mode (no verified domain) Resend only delivers to your own
// account email. Set RESEND_FROM to override once a domain is verified.
const FROM = process.env.RESEND_FROM ?? "onboarding@resend.dev"

export async function sendMail({
  to,
  subject,
  html,
}: {
  to:      string
  subject: string
  html:    string
}): Promise<void> {
  const { error } = await resend.emails.send({ from: FROM, to, subject, html })
  if (error) throw new Error(`Email delivery failed: ${error.message}`)
}
