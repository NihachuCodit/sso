import rateLimit from "express-rate-limit"

export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30
})

export const authRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20
})

export const otpRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5
})