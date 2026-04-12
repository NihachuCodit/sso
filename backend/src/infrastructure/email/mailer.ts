import { Resend } from "resend"
import nodemailer from "nodemailer"

// ── Resend ────────────────────────────────────────────────────────────────────
// Used when RESEND_API_KEY is set. In sandbox mode (no verified domain) emails
// are visible at resend.com/emails but not delivered to real inboxes.
// Set RESEND_FROM once a domain is verified.

function sendViaResend(to: string, subject: string, html: string): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const from   = process.env.RESEND_FROM ?? "onboarding@resend.dev"
  return resend.emails.send({ from, to, subject, html }).then(({ error }) => {
    if (error) throw new Error(`Resend: ${error.message}`)
  })
}

// ── SMTP (nodemailer) ─────────────────────────────────────────────────────────
// Used when SMTP_HOST + SMTP_USER + SMTP_PASSWORD are set.
// Works with Yandex, Gmail app passwords, etc. — no domain required.

function sendViaSmtp(to: string, subject: string, html: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST!,
    port:   Number(process.env.SMTP_PORT ?? 465),
    secure: process.env.SMTP_PORT !== "587",
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASSWORD!,
    },
  })
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER!
  return transporter.sendMail({ from, to, subject, html }).then(() => void 0)
}

// ── Selector ──────────────────────────────────────────────────────────────────
// SMTP takes precedence when both are configured — it delivers to real inboxes
// without a verified domain, making it the better choice during development.

export async function sendMail({
  to,
  subject,
  html,
}: {
  to:      string
  subject: string
  html:    string
}): Promise<void> {
  const hasSmtp   = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD)
  const hasResend = !!process.env.RESEND_API_KEY

  if (hasSmtp)   return sendViaSmtp(to, subject, html)
  if (hasResend) return sendViaResend(to, subject, html)

  throw new Error("No email transport configured (set SMTP_* or RESEND_API_KEY)")
}
