import { Router, Response } from "express"
import { authMiddleware, AuthRequest } from "../../../infrastructure/middleware/authMiddleware"
import { userRepository } from "../../../infrastructure/repositories/userRepository"

const router = Router()

router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { userId, email, isAdmin } = req.user!
  const user = await userRepository.findById(userId)
  res.json({ user: { userId, email, isAdmin, displayName: user?.displayName ?? null } })
})

router.patch("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { displayName } = req.body

    if (typeof displayName !== "string")
      return res.status(400).json({ error: "displayName must be a string" })

    const trimmed = displayName.trim().slice(0, 64)

    await userRepository.update(req.user!.userId, { displayName: trimmed || null })

    res.json({ message: "Profile updated" })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

export default router
