const cache = new Map<string, string>()

export function devCacheOtp(email: string, code: string) {
  cache.set(email.toLowerCase(), code)
}

export function devConsumeOtp(email: string): string | undefined {
  const key = email.toLowerCase()
  const code = cache.get(key)
  if (code) cache.delete(key)
  return code
}
