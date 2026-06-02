import { Router } from 'express'
import * as ctrl from './auth.controller'
import { authLimiter } from '../../middleware/rateLimiter'
import { requireCustomer } from '../../middleware/auth'

const router = Router()

// Public routes (with rate limiting)
router.post('/request-otp', authLimiter, ctrl.requestOtp)
router.post('/verify-otp', authLimiter, ctrl.verifyOtp)
router.post('/refresh', ctrl.refresh)
router.post('/logout', ctrl.logout)

// Protected
router.get('/me', requireCustomer, ctrl.me)

export default router
