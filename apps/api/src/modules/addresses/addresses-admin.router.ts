import { Router } from 'express'
import * as ctrl from './addresses.controller'
import { requirePermission } from '../../middleware/auth'

const router = Router()

router.get(
  '/:customerId/addresses',
  requirePermission('customers', 'read'),
  ctrl.adminGetCustomerAddresses
)
router.post(
  '/:customerId/addresses',
  requirePermission('customers', 'write'),
  ctrl.adminCreateCustomerAddress
)
router.delete(
  '/:customerId/addresses/:addressId',
  requirePermission('customers', 'write'),
  ctrl.adminDeleteCustomerAddress
)

export default router
