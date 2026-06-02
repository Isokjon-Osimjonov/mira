import { Router } from 'express'
import * as ctrl from './inventory.controller'
import { requirePermission } from '../../middleware/auth'

const router = Router()

// All inventory routes require admin permissions
router.get('/stock', requirePermission('inventory', 'read'), ctrl.getStockSummary)
router.post('/batches', requirePermission('inventory', 'write'), ctrl.createBatch)
router.get('/batches/:productId', requirePermission('inventory', 'read'), ctrl.getBatchesByProduct)
router.patch('/batches/:id', requirePermission('inventory', 'write'), ctrl.updateBatch)
router.post('/write-off', requirePermission('inventory', 'write'), ctrl.writeOffStock)
router.get('/write-offs', requirePermission('inventory', 'read'), ctrl.getWriteOffHistory)

export default router
