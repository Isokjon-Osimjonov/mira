import { Router } from 'express'
import * as ctrl from './orders.controller'
import * as service from './orders.service'
import { requirePermission, requireAdmin } from '../../middleware/auth'
import { db } from '../../config/db'
import { orders } from '@mira/db'
import { inArray } from 'drizzle-orm'

const adminRouter = Router()

adminRouter.post('/bulk-status', requirePermission('orders', 'write'), async (req: any, res, next) => {
  try {
    const { ids, status } = req.body
    if (!ids?.length || !status) throw {
      status: 400,
      code: 'INVALID_REQUEST',
      message: 'ids va status talab qilinadi'
    }

    const admin = req.user as import('../../middleware/auth').AdminJwtPayload;
    const results = await service.bulkUpdateStatus(ids, status, admin?.sub, admin?.fullName, req.body.payloadOverrides)
    res.json({ success: true, ...results })
  } catch (err) {
    next(err)
  }
})

adminRouter.get('/', requirePermission('orders', 'read'), ctrl.adminGetOrders)
adminRouter.get('/status-counts', requirePermission('orders', 'read'), ctrl.getStatusCounts)
adminRouter.get('/:id', requirePermission('orders', 'read'), ctrl.adminGetOrderDetail)

adminRouter.get('/:id/invoice', requirePermission('orders', 'read'), ctrl.downloadInvoice)

adminRouter.post('/', requirePermission('orders', 'write'), ctrl.adminCreateOrder)

adminRouter.patch('/:id/status', requirePermission('orders', 'write'), ctrl.adminUpdateStatus)
adminRouter.post('/:id/confirm-payment', requirePermission('orders', 'write'), ctrl.confirmPayment)
adminRouter.patch('/:id/delivery-estimate', requirePermission('orders', 'write'), ctrl.updateDeliveryEstimate)


adminRouter.patch('/:id/reject-payment', requirePermission('orders', 'write'), ctrl.rejectPayment)
adminRouter.patch('/:id/start-packing', requirePermission('orders', 'write'), ctrl.startPacking)
adminRouter.patch('/:id/ship', requirePermission('orders', 'write'), ctrl.shipOrder)
adminRouter.patch('/:id/deliver', requirePermission('orders', 'write'), ctrl.deliverOrder)
adminRouter.patch('/:id/cancel', requirePermission('orders', 'write'), ctrl.cancelOrder)
adminRouter.patch('/:id/refund', requirePermission('orders', 'write'), ctrl.refundOrder)

adminRouter.get('/:id/expenses', requirePermission('orders', 'read'), ctrl.getOrderExpenses)
adminRouter.post('/:id/expenses', requirePermission('orders', 'write'), ctrl.addOrderExpense)
adminRouter.post('/:id/scan-item', requireAdmin, ctrl.scanOrderItem)

export { adminRouter as ordersAdminRouter }
