import { Router } from 'express'
import * as ctrl from './boxes.controller'
import { requireAdmin, requirePermission } from '../../middleware/auth'

const boxesRouter = Router()
const boxesAdminRouter = Router()

// Public
boxesRouter.get('/', ctrl.getActiveBoxes)

// Admin
boxesAdminRouter.use(requireAdmin)

boxesAdminRouter.get('/', requirePermission('settings', 'read'), ctrl.getAllBoxes)
boxesAdminRouter.post('/', requirePermission('settings', 'write'), ctrl.createBox)
boxesAdminRouter.patch('/:id', requirePermission('settings', 'write'), ctrl.updateBox)
boxesAdminRouter.delete('/:id', requirePermission('settings', 'write'), ctrl.deleteBox)
boxesAdminRouter.post('/:id/stock', requirePermission('settings', 'write'), ctrl.adjustStock)

export { boxesRouter, boxesAdminRouter }
