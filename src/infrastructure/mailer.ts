export async function sendOtpEmail(to: string, code: string) {
    console.log(`[Mailer] OTP for ${to}: ${code}`)
    // Позже заменим на SMTP
  }