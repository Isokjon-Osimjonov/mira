import { Router } from 'express'
import * as ctrl from './admin-auth.controller'
import { authLimiter } from '../../../middleware/rateLimiter'
import { requireAdmin } from '../../../middleware/auth'

const router = Router()

router.post('/login', authLimiter, ctrl.login)
router.post('/refresh', ctrl.refresh)
router.post('/logout', ctrl.logout)
router.patch('/change-password', requireAdmin, ctrl.changePassword)
router.get('/me', requireAdmin, ctrl.getMe)

export default router
