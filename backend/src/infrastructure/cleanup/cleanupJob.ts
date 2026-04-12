import { prisma } from "../prisma"

// ── Retention policy ──────────────────────────────────────────────────────────
// After a token / session reaches one of these ages it is safe to hard-delete.
// Adjust via env vars if needed.
const OTP_GRACE_DAYS             = 1   // expired/used OTPs
const REFRESH_TOKEN_GRACE_DAYS   = 30  // used/orphaned refresh tokens
const SESSION_GRACE_DAYS         = 30  // revoked sessions

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

export async function runCleanup(): Promise<void> {
  const start = Date.now()

  const [otps, tokens, sessions] = await Promise.all([
    // OTPs that are used or expired and older than grace period
    prisma.otp.deleteMany({
      where: {
        OR: [
          { used: true,  createdAt: { lt: daysAgo(OTP_GRACE_DAYS) } },
          { expiresAt:   { lt: daysAgo(OTP_GRACE_DAYS) } },
        ],
      },
    }),

    // Used refresh tokens older than grace period
    prisma.refreshToken.deleteMany({
      where: {
        used:      true,
        createdAt: { lt: daysAgo(REFRESH_TOKEN_GRACE_DAYS) },
      },
    }),

    // Revoked sessions (and their orphaned refresh tokens via cascade) older than grace period
    prisma.session.deleteMany({
      where: {
        revoked:   true,
        createdAt: { lt: daysAgo(SESSION_GRACE_DAYS) },
      },
    }),
  ])

  const elapsed = Date.now() - start
  console.log(
    `[cleanup] done in ${elapsed}ms — ` +
    `otps=${otps.count} refresh_tokens=${tokens.count} sessions=${sessions.count}`,
  )
}

// ── Scheduler ─────────────────────────────────────────────────────────────────
// Runs once on startup (catch-up) then every 24 h.

const INTERVAL_MS = 24 * 60 * 60 * 1000

export function startCleanupJob(): void {
  // Delay first run by 30 s so the server is fully ready
  setTimeout(() => {
    runCleanup().catch(err => console.error("[cleanup] error:", err))
    setInterval(() => {
      runCleanup().catch(err => console.error("[cleanup] error:", err))
    }, INTERVAL_MS)
  }, 30_000)

  console.log("[cleanup] job scheduled (every 24 h, first run in 30 s)")
}
