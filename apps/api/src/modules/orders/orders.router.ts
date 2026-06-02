import { Router } from 'express'
import * as ctrl from './orders.controller'
import { requireCustomer } from '../../middleware/auth'

const router = Router()

router.use(requireCustomer)

router.post('/', ctrl.checkout)
router.get('/', ctrl.getCustomerOrders)
router.get('/:id', ctrl.getCustomerOrderDetail)
router.get('/:id/invoice', ctrl.downloadInvoice)
router.post('/:id/receipt', ctrl.uploadReceipt)
router.post('/:id/cancel', ctrl.cancelOrderByCustomer)
router.post('/:id/request-refund', ctrl.requestRefund)

export default router
