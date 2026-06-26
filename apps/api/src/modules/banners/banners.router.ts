import { Router } from 'express'
import * as ctrl from './banners.controller'
import { requireAdmin, requirePermission } from '../../middleware/auth'

const publicRouter = Router()
const adminRouter = Router()

// Public — optional auth to filter by region
publicRouter.get('/', ctrl.getPublicBanners)

// Admin
adminRouter.use(requireAdmin)
adminRouter.get('/', requirePermission('settings', 'read'), ctrl.adminGetBanners)
adminRouter.post('/', requirePermission('settings', 'write'), ctrl.adminCreateBanner)
adminRouter.patch('/:id', requirePermission('settings', 'write'), ctrl.adminUpdateBanner)
adminRouter.delete('/:id', requirePermission('settings', 'write'), ctrl.adminDeleteBanner)

export { publicRouter as bannersRouter, adminRouter as bannersAdminRouter }
