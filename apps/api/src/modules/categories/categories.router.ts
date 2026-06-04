import { Router } from 'express'
import * as ctrl from './categories.controller'
import { requireAdmin, requirePermission } from '../../middleware/auth'

const publicRouter = Router()
const adminRouter = Router()

// Public (mount at /api/v1/categories)
publicRouter.get('/', ctrl.getCategoriesTree)

// Admin (mount at /api/v1/admin/categories)
adminRouter.get(
  '/',
  requireAdmin,
  requirePermission('products', 'read'),
  ctrl.getAllCategoriesAdmin
)
adminRouter.post('/', requireAdmin, requirePermission('products', 'write'), ctrl.createCategory)
adminRouter.patch('/:id', requireAdmin, requirePermission('products', 'write'), ctrl.updateCategory)
adminRouter.put('/:id', requireAdmin, requirePermission('products', 'write'), ctrl.updateCategory)
adminRouter.delete(
  '/:id',
  requireAdmin,
  requirePermission('products', 'write'),
  ctrl.deleteCategory
)

export { publicRouter as categoryRouter, adminRouter as categoryAdminRouter }
