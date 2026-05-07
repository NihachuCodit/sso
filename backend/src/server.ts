import express      from "express"
import cors         from "cors"
import helmet       from "helmet"
import cookieParser from "cookie-parser"

import { prisma } from "./infrastructure/prisma"
import { correlationIdMiddleware }                                                        from "./infrastructure/middleware/correlationId"
import { initRateLimiters, globalRateLimiter, authRateLimiter, otpRateLimiter, sessionRateLimiter } from "./infrastructure/middleware/rateLimiter"

import registerRoute       from "./interfaces/routes/auth/register.route"
import loginRoute          from "./interfaces/routes/auth/login.route"
import otpRoute            from "./interfaces/routes/auth/otp.route"
import verifyOtpRoute      from "./interfaces/routes/auth/verifyOtp.route"
import refreshRoute        from "./interfaces/routes/auth/refresh.route"
import logoutRoute         from "./interfaces/routes/auth/logout.route"
import logoutAllRoute      from "./interfaces/routes/auth/logoutAll.route"
import profileRoute        from "./interfaces/routes/auth/profile.route"
import changePasswordRoute from "./interfaces/routes/auth/changePassword.route"
import resetPasswordRoute  from "./interfaces/routes/auth/resetPassword.route"
import sessionsRoute       from "./interfaces/routes/sessions/sessions.route"
import adminUsersRoute     from "./interfaces/routes/admin/users.route"
import adminAuditLogsRoute from "./interfaces/routes/admin/auditLogs.route"
import devOtpRoute         from "./interfaces/routes/dev/devOtp.route"
import { startCleanupJob } from "./infrastructure/cleanup/cleanupJob"

// ─── Env validation ───────────────────────────────────────────────────────────

const REQUIRED_ENV = ["JWT_SECRET", "JWT_REFRESH_SECRET", "DATABASE_URL"] as const

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[startup] Missing required environment variable: ${key}`)
    process.exit(1)
  }
}

const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD)
if (!hasSmtp) {
  console.warn("[startup] Warning: no email transport configured — OTP delivery will fail. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD.")
} else {
  console.log("[email] transport: SMTP")
}

// ─── App ──────────────────────────────────────────────────────────────────────

const app = express()

// Correlation ID first — every subsequent handler can read X-Request-ID
app.use(correlationIdMiddleware)

// Security headers
app.use(helmet())

// CORS — credentials: true is required for httpOnly cookie-based refresh tokens.
// In production set CORS_ORIGIN to a comma-separated list of allowed origins.
// In development, origin: true reflects the request's Origin header (equivalent
// to "*" but compatible with credentials).
const corsOrigins = process.env.CORS_ORIGIN?.split(",").map(o => o.trim())
app.use(cors({
  origin:      corsOrigins ?? (process.env.NODE_ENV !== "production" ? true : false),
  credentials: true,
}))

app.use(express.json({ limit: "16kb" }))
app.use(cookieParser())
app.use(globalRateLimiter)

app.use("/auth/register",        authRateLimiter, registerRoute)
app.use("/auth/login",           authRateLimiter, loginRoute)
app.use("/auth/otp",             otpRateLimiter,  otpRoute)
app.use("/auth/verify-otp",      authRateLimiter, verifyOtpRoute)
app.use("/auth/refresh",         authRateLimiter, refreshRoute)
app.use("/auth/logout",          authRateLimiter, logoutRoute)
app.use("/auth/logout-all",      authRateLimiter, logoutAllRoute)
app.use("/auth/profile",         profileRoute)
app.use("/auth/change-password", authRateLimiter, changePasswordRoute)
app.use("/auth/reset-password",  authRateLimiter, resetPasswordRoute)
app.use("/sessions",             sessionRateLimiter, sessionsRoute)
app.use("/admin/users",          adminUsersRoute)
app.use("/admin/audit-logs",     adminAuditLogsRoute)

if (process.env.NODE_ENV !== "production") {
  app.use("/dev", devOtpRoute)
}

app.get("/",(_, res) => res.json({ status: "ok", service: "sso-idp" }))

// ─── Global error handler ─────────────────────────────────────────────────────

// Must have 4 parameters so Express recognises it as an error middleware.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status  = typeof err.status === "number" ? err.status : 500
  const message = err.message ?? "Internal server error"
  if (status >= 500) console.error("[error]", err)
  res.status(status).json({ error: message })
})

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 3000

async function start() {
  await initRateLimiters()

  startCleanupJob()

  const server = app.listen(PORT, () => {
    const cyan  = "\x1b[36m"
    const green = "\x1b[32m"
    const dim   = "\x1b[2m"
    const reset = "\x1b[0m"

    console.log(`
${cyan}  ███████╗███████╗ ██████╗       ██╗██████╗ ██████╗
  ██╔════╝██╔════╝██╔═══██╗      ██║██╔══██╗██╔══██╗
  ███████╗███████╗██║   ██║█████╗██║██║  ██║██████╔╝
  ╚════██║╚════██║██║   ██║╚════╝██║██║  ██║██╔═══╝
  ███████║███████║╚██████╔╝      ██║██████╔╝██║
  ╚══════╝╚══════╝ ╚═════╝       ╚═╝╚═════╝ ╚═╝${reset}
  ${dim}Identity Provider${reset}

  ${green}▸ Listening${reset}  http://localhost:${PORT}
  ${green}▸ Health${reset}     GET /
  ${green}▸ Auth${reset}       POST /auth/{register,login,otp,verify-otp,refresh,logout,logout-all}
  ${green}▸ Password${reset}   POST /auth/{change-password,reset-password}
  ${green}▸ Profile${reset}    GET|PATCH /auth/profile
  ${green}▸ Sessions${reset}   GET|DELETE /sessions  ·  GET /sessions/:id
  ${dim}─────────────────────────────────────────────────${reset}
`)
  })

  async function shutdown(signal: string) {
    console.log(`\n[shutdown] ${signal} received — closing server`)
    server.close(async () => {
      await prisma.$disconnect()
      console.log("[shutdown] clean exit")
      process.exit(0)
    })
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"))
  process.on("SIGINT",  () => shutdown("SIGINT"))
}

start().catch((err) => {
  console.error("[startup] fatal:", err)
  process.exit(1)
})
