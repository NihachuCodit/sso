import zxcvbn from "zxcvbn"

// NIST SP 800-63B: minimum 8 chars, no mandatory composition rules,
// reject only passwords that are trivially guessable (score 0–1).
export function checkPasswordStrength(password: string) {
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters")
  }

  const result = zxcvbn(password)

  if (result.score < 2) {
    const suggestion = result.feedback.suggestions[0]
    throw new Error(suggestion ? `Password too weak: ${suggestion}` : "Password too weak")
  }
}