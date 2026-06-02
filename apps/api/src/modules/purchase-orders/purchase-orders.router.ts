import { Router } from 'express'
import * as ctrl from './purchase-orders.controller'
import { requireAdmin, requirePermission } from '../../middleware/auth'

const router = Router()

router.use(requireAdmin)

router.get('/', requirePermission('inventory', 'read'), ctrl.getPurchaseOrders)
router.get('/:id', requirePermission('inventory', 'read'), ctrl.getPurchaseOrderById)
router.post('/', requirePermission('inventory', 'write'), ctrl.createPurchaseOrder)
router.put('/:id', requirePermission('inventory', 'write'), ctrl.updatePurchaseOrder)
router.patch('/:id/status', requirePermission('inventory', 'write'), ctrl.updateStatus)
router.patch('/:id/receive', requirePermission('inventory', 'write'), ctrl.receiveOrder)
router.delete('/:id', requirePermission('inventory', 'delete'), ctrl.deletePurchaseOrder)

export default router
