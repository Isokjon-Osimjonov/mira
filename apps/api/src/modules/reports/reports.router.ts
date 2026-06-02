import { Router } from 'express'
import * as ctrl from './reports.controller'
import { requireAdmin, requirePermission } from '../../middleware/auth'

const router = Router()

router.use(requireAdmin)
router.use(requirePermission('analytics', 'read'))

router.get('/pl', ctrl.getPLReport)
router.get('/sales', ctrl.getSalesReport)
router.get('/transactions', ctrl.getTransactionsReport)
router.get('/inventory', ctrl.getInventoryReport)
router.get('/customers', ctrl.getCustomersReport)
router.get('/coupons', ctrl.getCouponsReport)
router.get('/expenses', ctrl.getExpensesReport)

export default router
