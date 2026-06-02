import { Router } from 'express'
import * as ctrl from './orders.controller'
import { requireCustomer } from '../../middleware/auth'

const router = Router()

router.use(requireCustomer)

router.post('/', ctrl.checkout)
router.get('/', ctrl.getCustomerOrders)
router.get('/:id', ctrl.getCustomerOrderDetail)
router.post('/:id/receipt', ctrl.uploadReceipt)

export default router
