import { Router } from 'express'
import * as ctrl from './roles.controller'
import { requireSuperAdmin } from '../../middleware/auth'

const router = Router()

router.use(requireSuperAdmin)

router.get('/', ctrl.getRoles)
router.get('/permissions-matrix', ctrl.getPermissionMatrix)
router.get('/:id', ctrl.getRoleById)
router.post('/', ctrl.createRole)
router.put('/:id', ctrl.updateRole)
router.patch('/:id/permissions', ctrl.updateGranularPermission)
router.delete('/:id', ctrl.deleteRole)

export default router
