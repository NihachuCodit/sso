import zxcvbn from "zxcvbn"

export function checkPasswordStrength(
  password: string
) {
  const result = zxcvbn(password)

  if (result.score < 3) {
    throw new Error("Password too weak")
  }
}