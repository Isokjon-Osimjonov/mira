import { Router } from 'express'
import * as ctrl from './suppliers.controller'
import { requireAdmin, requirePermission } from '../../middleware/auth'

const router = Router()

router.use(requireAdmin)

router.get('/', requirePermission('suppliers', 'read'), ctrl.getSuppliers)
router.get('/:id', requirePermission('suppliers', 'read'), ctrl.getSupplierById)
router.post('/', requirePermission('suppliers', 'write'), ctrl.createSupplier)
router.patch('/:id', requirePermission('suppliers', 'write'), ctrl.updateSupplier)
router.delete('/:id', requirePermission('suppliers', 'write'), ctrl.deleteSupplier)
router.get('/:id/batches', requirePermission('suppliers', 'read'), ctrl.getSupplierBatches)

export default router
