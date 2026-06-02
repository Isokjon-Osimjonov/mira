import { Router } from 'express'
import * as ctrl from './notifications.controller'
import { requireCustomer, requirePermission } from '../../middleware/auth'

const router = Router()

// Customer
router.get('/', requireCustomer, ctrl.getNotifications)
router.get('/unread-count', requireCustomer, ctrl.getUnreadCount)
router.patch('/read-all', requireCustomer, ctrl.markAllAsRead)
router.patch('/:id/read', requireCustomer, ctrl.markAsRead)

// Admin
router.post('/admin/send', requirePermission('customers', 'write'), ctrl.adminSendNotification)

export default router
