import nodemailer from "nodemailer"

export async function sendMail({
  to,
  subject,
  html,
}: {
  to:      string
  subject: string
  html:    string
}): Promise<void> {
  if (!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD)) {
    throw new Error("No email transport configured (set SMTP_HOST, SMTP_USER, SMTP_PASSWORD)")
  }

  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT ?? 465),
    secure: process.env.SMTP_PORT !== "587",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  })

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER
  await transporter.sendMail({ from, to, subject, html })
}
