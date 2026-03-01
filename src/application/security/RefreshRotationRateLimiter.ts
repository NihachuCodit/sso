const attempts = new Map<string, number>()

export function checkRefreshRotationLimit(userId: string) {
  const record = attempts.get(userId) || 0

  if (record > 5) {
    throw new Error("Too many refresh attempts")
  }

  attempts.set(userId, record + 1)

  setTimeout(() => {
    attempts.delete(userId)
  }, 60000)
}