import { Router } from 'express'
import * as ctrl from './customers.controller'
import { requirePermission } from '../../middleware/auth'

const router = Router()

// All require customers permission
router.use(requirePermission('customers', 'read'))

router.get('/', ctrl.getCustomers)
router.get('/:id', ctrl.getCustomerById)
router.get('/:id/orders', ctrl.getCustomerOrders)
router.get('/:id/activity', ctrl.getCustomerActivity)
router.post('/walk-in', requirePermission('customers', 'write'), ctrl.createWalkInCustomer)

router.patch('/:id/notes', requirePermission('customers', 'write'), ctrl.updateNotes)
router.patch('/:id/block', requirePermission('customers', 'write'), ctrl.blockCustomer)
router.patch('/:id/unblock', requirePermission('customers', 'write'), ctrl.unblockCustomer)
router.delete('/:id', requirePermission('customers', 'delete'), ctrl.deleteCustomer)

router.post('/:id/assign-coupon', requirePermission('coupons', 'write'), ctrl.assignCoupon)

export default router
