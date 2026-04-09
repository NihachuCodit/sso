import { Router, Request, Response } from "express"
import { registerUser } from "../../../application/auth/RegisterUser"

const router = Router()

router.post("/", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    const user = await registerUser({
      email,
      password,
      ip:        req.ip,
      userAgent: req.headers["user-agent"] as string | undefined,
    })
    res.status(201).json({ user })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

export default router
