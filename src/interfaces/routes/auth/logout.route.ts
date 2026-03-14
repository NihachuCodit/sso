import { Router, Request, Response } from "express"
import { logoutUser } from "../../../application/auth/LogoutUser"

const router = Router()

router.post("/", async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken)
      return res.status(400).json({ error: "Refresh token required" })

    await logoutUser(refreshToken)

    res.json({ message: "Logged out successfully" })

  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

export default router
