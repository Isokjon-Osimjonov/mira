import { Router } from 'express'
import * as ctrl from './kor-shipping.controller'
import { requirePermission } from '../../middleware/auth'

const publicRouter = Router()
const adminRouter = Router()

// Public
publicRouter.get('/', ctrl.getActiveTiers)

// Admin
adminRouter.get('/', requirePermission('settings', 'read'), ctrl.getAllTiers)
adminRouter.post('/', requirePermission('settings', 'write'), ctrl.createTier)
adminRouter.put('/:id', requirePermission('settings', 'write'), ctrl.updateTier)
adminRouter.delete('/:id', requirePermission('settings', 'write'), ctrl.deleteTier)

export { publicRouter as korShippingRouter, adminRouter as korShippingAdminRouter }
