import express from "express"
import cors from "cors"

import { globalRateLimiter, authRateLimiter, otpRateLimiter } from "./infrastructure/middleware/rateLimitMiddleware"

import registerRoute from "./interfaces/routes/auth/register.route"
import loginRoute from "./interfaces/routes/auth/login.route"
import otpRoute from "./interfaces/routes/auth/otp.route"
import verifyOtpRoute from "./interfaces/routes/auth/verifyOtp.route"
import refreshRoute from "./interfaces/routes/auth/refresh.route"
import logoutRoute from "./interfaces/routes/auth/logout.route"
import profileRoute from "./interfaces/routes/auth/profile.route"
import getSessionRoute from "./interfaces/routes/sessions/getSession.route"

const app = express()

app.use(cors())
app.use(express.json())
app.use(globalRateLimiter)

app.use("/auth/register", authRateLimiter, registerRoute)
app.use("/auth/login",    authRateLimiter, loginRoute)
app.use("/auth/otp",      otpRateLimiter,  otpRoute)
app.use("/auth/verify-otp", authRateLimiter, verifyOtpRoute)
app.use("/auth/refresh",  refreshRoute)
app.use("/auth/logout",   logoutRoute)
app.use("/auth/profile",  profileRoute)
app.use("/sessions",      getSessionRoute)

app.get("/", (_, res) => res.json({ status: "ok", service: "sso-idp" }))

const PORT = Number(process.env.PORT) || 3000

app.listen(PORT, () => {
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
  ${green}▸ Auth${reset}       POST /auth/{register,login,otp,verify-otp,refresh,logout}
  ${green}▸ Profile${reset}    GET  /auth/profile
  ${green}▸ Sessions${reset}   GET  /sessions/:id
  ${dim}─────────────────────────────────────────────────${reset}
`)
})
