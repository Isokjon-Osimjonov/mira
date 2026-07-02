import { Router } from 'express'
import * as ctrl from './analytics.controller'
import { requireAdmin, requirePermission } from '../../middleware/auth'

const router = Router()

router.use(requireAdmin)
router.use(requirePermission('analytics', 'read'))

router.get('/overview', ctrl.getOverview)
router.get('/revenue', ctrl.getRevenue)
router.get('/top-products', ctrl.getTopProducts)
router.get('/pl', ctrl.getPL)
router.get('/order-funnel', ctrl.getOrderFunnel)
router.get('/customers', ctrl.getCustomers)
router.get('/coupons', ctrl.getCouponStats)
router.get('/coupon-performance', ctrl.getCouponPerformance)
router.get('/export', ctrl.exportCSV)

export default router
