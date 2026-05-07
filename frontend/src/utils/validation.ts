export function passwordError(pw: string): string {
  if (pw.length < 8) return "Минимум 8 символов"
  if (!/[0-9!@#$%^&*()\-_=+[\]{};':",.<>/?\\|`~]/.test(pw))
    return "Должен содержать цифру или спецсимвол"
  return ""
}
