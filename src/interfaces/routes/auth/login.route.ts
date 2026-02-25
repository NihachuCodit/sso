import { Router } from 'express'
import loginUser from '../../../application/auth/LoginUser'

const router = Router()

router.post('/', loginUser)

export default router