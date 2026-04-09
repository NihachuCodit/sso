export function otpEmailHtml(code: string, expiresMinutes = 5): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your verification code</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:8px;padding:40px;box-shadow:0 1px 4px rgba(0,0,0,.08);">
          <tr>
            <td>
              <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Verification code</h2>
              <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
                Use the code below to complete your sign-in or password reset.
                It expires in ${expiresMinutes} minutes.
              </p>
              <div style="text-align:center;margin:0 0 24px;">
                <span style="display:inline-block;letter-spacing:8px;font-size:36px;
                             font-weight:700;color:#111827;background:#f4f4f5;
                             padding:16px 24px;border-radius:6px;font-variant-numeric:tabular-nums;">
                  ${code}
                </span>
              </div>
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                If you didn't request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()
}
