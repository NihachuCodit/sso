/**
 * In-memory store for plaintext OTPs — dev/test environments only.
 * Never imported in production (server.ts guards the route registration).
 *
 * Keyed by email. Entry is deleted on first read so each OTP can only
 * be consumed once via the dev endpoint.
 */
const cache = new Map<string, string>()

export function devCacheOtp(email: string, code: string): void {
  cache.set(email, code)
}

export function devConsumeOtp(email: string): string | undefined {
  const code = cache.get(email)
  cache.delete(email)
  return code
}
