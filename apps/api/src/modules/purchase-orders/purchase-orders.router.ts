import { Router } from 'express'
import * as ctrl from './purchase-orders.controller'
import { requireAdmin, requirePermission } from '../../middleware/auth'

const router = Router()

router.use(requireAdmin)

router.get('/', requirePermission('purchase_orders', 'read'), ctrl.getPurchaseOrders)
router.get('/:id', requirePermission('purchase_orders', 'read'), ctrl.getPurchaseOrderById)
router.post('/', requirePermission('purchase_orders', 'write'), ctrl.createPurchaseOrder)
router.put('/:id', requirePermission('purchase_orders', 'write'), ctrl.updatePurchaseOrder)
router.patch('/:id/status', requirePermission('purchase_orders', 'write'), ctrl.updateStatus)
router.post('/:id/receive', requirePermission('purchase_orders', 'write'), ctrl.receiveOrder)
router.post('/:id/payment', requirePermission('purchase_orders', 'write'), ctrl.recordPayment)
router.delete('/:id', requirePermission('purchase_orders', 'delete'), ctrl.deletePurchaseOrder)

export default router
