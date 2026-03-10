import { Router } from "express"
import { loginUser } from "../../../application/auth/LoginUser"

const router = Router()

router.post("/", async (req, res) => {
  try {
    const { email, password } = req.body
    const tokens = await loginUser({ email, password })
    res.json(tokens)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

export default router