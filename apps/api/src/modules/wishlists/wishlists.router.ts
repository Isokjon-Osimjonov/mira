import { Router } from 'express'
import * as ctrl from './wishlists.controller'
import { requireCustomer } from '../../middleware/auth'

const router = Router()

router.use(requireCustomer)

router.get('/', ctrl.getWishlist)
router.post('/', ctrl.addToWishlist)
router.delete('/:productId', ctrl.removeFromWishlist)

export default router
