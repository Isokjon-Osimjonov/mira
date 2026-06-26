import { Router } from 'express'
import * as ctrl from './cart.controller'
import { requireCustomer } from '../../middleware/auth'

const router = Router()

router.use(requireCustomer)

router.get('/', ctrl.getCart)
router.get('/weight', ctrl.getCartWeight)
router.post('/items', ctrl.addItem)
router.patch('/items/:itemId', ctrl.updateItem)
router.delete('/items/:itemId', ctrl.deleteItem)
router.delete('/', ctrl.clearCart)
router.post('/validate-coupon', ctrl.validateCoupon)

export default router
