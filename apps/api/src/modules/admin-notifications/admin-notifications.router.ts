import { Router } from 'express'
import * as ctrl from './admin-notifications.controller'
import { requireAdmin } from '../../middleware/auth'

const router = Router()

router.use(requireAdmin)

router.get('/', ctrl.getNotifications)
router.get('/unread-count', ctrl.getUnreadCount)
router.post('/mark-all-read', ctrl.markAllRead)
router.delete('/clear', ctrl.clearAll)

export default router
