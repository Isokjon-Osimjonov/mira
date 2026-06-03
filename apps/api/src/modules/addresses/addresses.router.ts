import { Router } from 'express'
import * as ctrl from './addresses.controller'
import { requireCustomer } from '../../middleware/auth'

const router = Router()

router.get('/', requireCustomer, ctrl.getAddresses)
router.post('/', requireCustomer, ctrl.createAddress)
router.put('/:id', requireCustomer, ctrl.updateAddress)
router.patch('/:id/set-default', requireCustomer, ctrl.setDefault)
router.delete('/:id', requireCustomer, ctrl.deleteAddress)
router.get('/search-juso', requireCustomer, ctrl.searchJuso)

export default router
