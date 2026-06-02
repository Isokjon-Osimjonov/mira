import { Router } from 'express'
import * as ctrl from './pick-pack.controller'
import { requireAdmin, requirePermission } from '../../middleware/auth'

const router = Router()

router.use(requireAdmin)

router.get('/:orderId/pack-status', requirePermission('orders', 'read'), ctrl.getPackStatus)
router.get('/:orderId/scan-history', requirePermission('orders', 'read'), ctrl.getScanHistory)

router.post('/:orderId/scan', requirePermission('orders', 'write'), ctrl.scanBarcode)
router.post(
  '/:orderId/items/:itemId/manual-confirm',
  requirePermission('orders', 'write'),
  ctrl.manualConfirm
)

export default router
