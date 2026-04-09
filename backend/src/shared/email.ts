// RFC-5322-inspired regex — catches the vast majority of malformed addresses
// without the complexity of a full parser.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function validateEmail(email: string): void {
  if (!EMAIL_REGEX.test(email)) {
    throw new Error("Invalid email address")
  }
}
