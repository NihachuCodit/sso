export function passwordError(pw: string): string {
  if (pw.length < 8) return "Minimum 8 characters"
  if (!/[0-9!@#$%^&*()\-_=+[\]{};':",.<>/?\\|`~]/.test(pw))
    return "Must include a number or special character"
  return ""
}
