import { Router } from 'express'
import * as ctrl from './admin-users.controller'
import { requireSuperAdmin } from '../../middleware/auth'

const router = Router()

router.use(requireSuperAdmin)

router.get('/', ctrl.getAdminUsers)
router.get('/:id', ctrl.getAdminUserById)
router.post('/', ctrl.createAdminUser)
router.put('/:id', ctrl.updateAdminUser)
router.patch('/:id/reset-password', ctrl.resetPassword)
router.delete('/:id', ctrl.deleteAdminUser)

export default router
