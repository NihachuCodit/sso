import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../../../infrastructure/middleware/authMiddleware'

const router = Router()

router.get("/", authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    user: req.user
  })
})

export default router