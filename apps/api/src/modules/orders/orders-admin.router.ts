import { Router } from 'express'
import * as ctrl from './orders.controller'
import { requirePermission } from '../../middleware/auth'

const adminRouter = Router()

adminRouter.get('/', requirePermission('orders', 'read'), ctrl.adminGetOrders)
adminRouter.get('/:id', requirePermission('orders', 'read'), ctrl.adminGetOrderDetail)
adminRouter.post('/', requirePermission('orders', 'write'), ctrl.adminCreateOrder)

adminRouter.patch('/:id/confirm-payment', requirePermission('orders', 'write'), ctrl.confirmPayment)
adminRouter.patch('/:id/reject-payment', requirePermission('orders', 'write'), ctrl.rejectPayment)
adminRouter.patch('/:id/start-packing', requirePermission('orders', 'write'), ctrl.startPacking)
adminRouter.patch('/:id/ship', requirePermission('orders', 'write'), ctrl.shipOrder)
adminRouter.patch('/:id/deliver', requirePermission('orders', 'write'), ctrl.deliverOrder)
adminRouter.patch('/:id/cancel', requirePermission('orders', 'write'), ctrl.cancelOrder)
adminRouter.patch('/:id/refund', requirePermission('orders', 'write'), ctrl.refundOrder)

adminRouter.get('/:id/expenses', requirePermission('orders', 'read'), ctrl.getOrderExpenses)
adminRouter.post('/:id/expenses', requirePermission('orders', 'write'), ctrl.addOrderExpense)

export { adminRouter as ordersAdminRouter }
