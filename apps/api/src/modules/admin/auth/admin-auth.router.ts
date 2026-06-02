import { Router } from 'express'
import * as ctrl from './admin-auth.controller'
import { authLimiter } from '../../../middleware/rateLimiter'

const router = Router()

router.post('/login', authLimiter, ctrl.login)
router.post('/refresh', ctrl.refresh)
router.post('/logout', ctrl.logout)

export default router
