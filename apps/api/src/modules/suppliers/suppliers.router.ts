import { Router } from 'express'
import * as ctrl from './suppliers.controller'
import { requireAdmin, requirePermission } from '../../middleware/auth'

const router = Router()

router.use(requireAdmin)

router.get('/', requirePermission('inventory', 'read'), ctrl.getSuppliers)
router.get('/:id', requirePermission('inventory', 'read'), ctrl.getSupplierById)
router.post('/', requirePermission('inventory', 'write'), ctrl.createSupplier)
router.put('/:id', requirePermission('inventory', 'write'), ctrl.updateSupplier)
router.delete('/:id', requirePermission('inventory', 'delete'), ctrl.deleteSupplier) // Assuming delete permission exists or fallback to write

export default router
