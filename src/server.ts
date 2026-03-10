import express from "express"
import cors from "cors"

import registerRoute from "./interfaces/routes/auth/register.route"
import loginRoute from "./interfaces/routes/auth/login.route"
import otpRoute from "./interfaces/routes/auth/otp.route"
import verifyOtpRoute from "./interfaces/routes/auth/verifyOtp.route"
import refreshRoute from "./interfaces/routes/auth/refresh.route"
import logoutRoute from "./interfaces/routes/auth/logout.route"
import profileRoute from "./interfaces/routes/auth/profile.route"

const app = express()
app.use(cors())
app.use(express.json())

app.use("/auth/register", registerRoute)
app.use("/auth/login", loginRoute)
app.use("/auth/otp", otpRoute)
app.use("/auth/verify-otp", verifyOtpRoute)
app.use("/auth/refresh", refreshRoute)
app.use("/auth/logout", logoutRoute)
app.use("/auth/profile", profileRoute)

app.get("/", (_, res) => {
  res.send("SSO Identity Provider is running!")
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running http://localhost:${PORT}`))