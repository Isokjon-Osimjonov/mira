import { Router } from 'express'
import * as ctrl from './settings.controller'
import { requirePermission } from '../../middleware/auth'

const publicRouter = Router()
const adminRouter = Router()

// Public
publicRouter.get('/payment-methods', ctrl.getPaymentMethods)
publicRouter.get('/payment-info', ctrl.getPaymentInfo)
publicRouter.get('/public-config', ctrl.getPublicConfig)

// Admin
adminRouter.get('/', requirePermission('settings', 'read'), ctrl.getAdminSettings)
adminRouter.put('/', requirePermission('settings', 'write'), ctrl.updateAdminSettings)

adminRouter.get(
  '/payment-methods',
  requirePermission('settings', 'read'),
  ctrl.getAdminPaymentMethods
)
adminRouter.patch(
  '/payment-methods/:method',
  requirePermission('settings', 'write'),
  ctrl.updatePaymentMethod
)

adminRouter.get(
  '/exchange-rates/live',
  requirePermission('settings', 'read'),
  ctrl.getLiveExchangeRate
)

adminRouter.get('/order', requirePermission('settings', 'read'), ctrl.getOrderSettings)
adminRouter.patch('/order', requirePermission('settings', 'write'), ctrl.updateOrderSettings)

export { publicRouter as settingsRouter, adminRouter as settingsAdminRouter }
