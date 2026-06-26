import { Router } from 'express'
import * as ctrl from './cargo-dates.controller'
import { requireAdmin, requirePermission } from '../../middleware/auth'

const publicRouter = Router()
const adminRouter = Router()

publicRouter.get('/', ctrl.getPublicCargoDates)

adminRouter.use(requireAdmin)
adminRouter.get('/', requirePermission('settings', 'read'), ctrl.adminGetCargoDates)
adminRouter.post('/', requirePermission('settings', 'write'), ctrl.adminCreateCargoDate)
adminRouter.patch('/:id', requirePermission('settings', 'write'), ctrl.adminUpdateCargoDate)
adminRouter.delete('/:id', requirePermission('settings', 'write'), ctrl.adminDeleteCargoDate)

export { publicRouter as cargoDatesRouter, adminRouter as cargoDatesAdminRouter }
