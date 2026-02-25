import { Router, Request, Response } from 'express'
import { registerUser } from '../../../application/auth/RegisterUser'

const router = Router()

router.post('/', async (req: Request, res: Response) => {
  try {
    const user = await registerUser(req.body)
    res.status(201).json({ user })
  } catch (err:any) {
    res.status(400).json({ error: err.message })
  }
})

export default router