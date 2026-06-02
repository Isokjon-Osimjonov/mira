import { Router } from 'express'
import * as ctrl from './boxes.controller'
import { requirePermission } from '../../middleware/auth'

const publicRouter = Router()
const adminRouter = Router()

// Public
publicRouter.get('/', ctrl.getActiveBoxes)

// Admin
adminRouter.get('/', requirePermission('boxes', 'read'), ctrl.getAllBoxes)
adminRouter.post('/', requirePermission('boxes', 'write'), ctrl.createBox)
adminRouter.put('/:id', requirePermission('boxes', 'write'), ctrl.updateBox)
adminRouter.delete('/:id', requirePermission('boxes', 'write'), ctrl.deleteBox)

export { publicRouter as boxesRouter, adminRouter as boxesAdminRouter }
