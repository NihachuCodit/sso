import { Router, Request, Response } from 'express'
import { rotateRefreshToken } from '../../../application/auth/RotateRefreshToken'

const router = Router()

router.post("/", async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token required'
      })
    }

    const result = await rotateRefreshToken(refreshToken)

    res.json(result)

  } catch (err:any) {
    res.status(403).json({
      error: err.message
    })
  }
})

export default router