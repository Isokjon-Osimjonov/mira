import { Router } from 'express'
import * as ctrl from './coupons.controller'
import { requirePermission, requireAuth } from '../../middleware/auth'

const adminRouter = Router()
const publicRouter = Router()

// Public
publicRouter.get('/available', requireAuth, ctrl.getAvailableCoupons)
publicRouter.get('/my-redemptions', requireAuth, ctrl.getMyRedemptions)

// Admin
adminRouter.get('/', requirePermission('coupons', 'read'), ctrl.getCoupons)
adminRouter.get('/generate-code', requirePermission('coupons', 'write'), ctrl.generateCode)
adminRouter.post('/', requirePermission('coupons', 'write'), ctrl.createCoupon)
adminRouter.get('/:id', requirePermission('coupons', 'read'), ctrl.getCouponById)
adminRouter.put('/:id', requirePermission('coupons', 'write'), ctrl.updateCoupon)
adminRouter.patch('/:id/status', requirePermission('coupons', 'write'), ctrl.updateCouponStatus)
adminRouter.delete('/:id', requirePermission('coupons', 'write'), ctrl.deleteCoupon)
adminRouter.get('/:id/redemptions', requirePermission('coupons', 'read'), ctrl.getCouponRedemptions)

export { adminRouter as couponsAdminRouter, publicRouter as couponsRouter }
