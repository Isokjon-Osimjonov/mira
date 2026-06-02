import { Router } from 'express'
import * as ctrl from './products.controller'
import { requireAdmin, requirePermission } from '../../middleware/auth'

const publicRouter = Router()
const adminRouter = Router()

// Public routes (mount at /api/v1/products)
publicRouter.get('/', ctrl.getProducts)
publicRouter.get('/brands', ctrl.getBrands)
publicRouter.get('/:id', ctrl.getProductById)
publicRouter.get('/category/:slug', ctrl.getProductsByCategorySlug)

// Admin routes (mount at /api/v1/admin/products)
adminRouter.get('/', requirePermission('products', 'read'), ctrl.getProductsAdmin)
adminRouter.post('/', requirePermission('products', 'write'), ctrl.createProduct)
adminRouter.put('/:id', requirePermission('products', 'write'), ctrl.updateProduct)
adminRouter.delete('/:id', requirePermission('products', 'write'), ctrl.deleteProduct)
adminRouter.put('/:id/pricing', requirePermission('products', 'write'), ctrl.updatePricing)

export { publicRouter as productRouter, adminRouter as productAdminRouter }
