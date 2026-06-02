import { Router } from 'express'
import * as ctrl from './settings.controller'
import { requirePermission } from '../../middleware/auth'

const publicRouter = Router()
const adminRouter = Router()

// Public
publicRouter.get('/payment-methods', ctrl.getPaymentMethods)

// Admin
adminRouter.get('/', requirePermission('settings', 'read'), ctrl.getAdminSettings)
adminRouter.put('/', requirePermission('settings', 'write'), ctrl.updateAdminSettings)

export { publicRouter as settingsRouter, adminRouter as settingsAdminRouter }
