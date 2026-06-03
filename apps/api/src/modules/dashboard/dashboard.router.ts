import { Router } from 'express'
import * as ctrl from './dashboard.controller'
import { requireAdmin, requirePermission, requireSuperAdmin } from '../../middleware/auth'

const router = Router()

router.use(requireAdmin)
router.use(requirePermission('analytics', 'read'))

router.get('/overview', ctrl.getOverview)
router.get('/revenue', ctrl.getRevenue)
router.get('/orders-by-status', ctrl.getOrdersByStatus)
router.get('/pl', ctrl.getPL)
router.get('/transactions', ctrl.getTransactions)
router.get('/products', ctrl.getProductPerformance)
router.get('/brands', ctrl.getBrandPerformance)
router.get('/inventory', ctrl.getInventoryHealth)
router.get('/customers', ctrl.getCustomerAnalytics)
router.get('/coupons', ctrl.getCouponAnalytics)
router.get('/cash-flow', ctrl.getCashFlow)

// Sensitive data
router.get('/admin-performance', requireSuperAdmin, ctrl.getAdminPerformance)

export default router
