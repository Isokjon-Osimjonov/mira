import { Router } from 'express'
import * as ctrl from './waitlists.controller'
import { requireCustomer, requirePermission } from '../../middleware/auth'

const router = Router()

// Customer
router.get('/', requireCustomer, ctrl.getWaitlist)
router.post('/', requireCustomer, ctrl.addToWaitlist)
router.delete('/:productId', requireCustomer, ctrl.removeFromWaitlist)

// Admin
router.get('/admin/:productId', requirePermission('inventory', 'read'), ctrl.adminGetWaitlist)

export default router
