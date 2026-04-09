import rateLimit, { Options, RateLimitRequestHandler } from "express-rate-limit"
import { Request, Response, NextFunction } from "express"

type Limiter = RateLimitRequestHandler

const base: Partial<Options> = { standardHeaders: true, legacyHeaders: false }

// Initialised synchronously with in-memory defaults; replaced with Redis store
// after initRateLimiters() resolves (called before app.listen in server.ts).
let globalRateLimiter_:  Limiter = rateLimit({ ...base, windowMs: 60 * 1000,     max: 30  })
let authRateLimiter_:    Limiter = rateLimit({ ...base, windowMs: 5 * 60 * 1000, max: 20  })
let otpRateLimiter_:     Limiter = rateLimit({ ...base, windowMs: 60 * 1000,     max: 5   })
let sessionRateLimiter_: Limiter = rateLimit({ ...base, windowMs: 60 * 1000,     max: 60  })

// Proxy exports — routes capture these references at import time; the inner
// variable is swapped after Redis connects without needing to re-register routes.
// Object.assign copies resetKey/getKey from the underlying handler so the type is satisfied.
function makeProxy(get: () => Limiter): Limiter {
  const fn = (req: Request, res: Response, next: NextFunction) => get()(req, res, next)
  return Object.assign(fn, {
    resetKey: (key: string)  => get().resetKey(key),
    getKey:   (key: string)  => get().getKey(key),
  }) as unknown as Limiter
}

export const globalRateLimiter:  Limiter = makeProxy(() => globalRateLimiter_)
export const authRateLimiter:    Limiter = makeProxy(() => authRateLimiter_)
export const otpRateLimiter:     Limiter = makeProxy(() => otpRateLimiter_)
export const sessionRateLimiter: Limiter = makeProxy(() => sessionRateLimiter_)

/**
 * If REDIS_URL is set, reconnects all limiters to a shared Redis store so that
 * rate-limit counters are enforced globally across every process/instance.
 * Must be awaited before app.listen().
 */
export async function initRateLimiters(): Promise<void> {
  if (!process.env.REDIS_URL) return

  const { createClient } = await import("redis")
  const { RedisStore }   = await import("rate-limit-redis")

  const client = createClient({ url: process.env.REDIS_URL })
  client.on("error", (err) => console.error("[redis] rate-limit error:", err))
  await client.connect()
  console.log("[redis] rate-limit store connected")

  const store = new RedisStore({ sendCommand: (...args: string[]) => client.sendCommand(args) })

  globalRateLimiter_  = rateLimit({ ...base, windowMs: 60 * 1000,     max: 30,  store })
  authRateLimiter_    = rateLimit({ ...base, windowMs: 5 * 60 * 1000, max: 20,  store })
  otpRateLimiter_     = rateLimit({ ...base, windowMs: 60 * 1000,     max: 5,   store })
  sessionRateLimiter_ = rateLimit({ ...base, windowMs: 60 * 1000,     max: 60,  store })
}
