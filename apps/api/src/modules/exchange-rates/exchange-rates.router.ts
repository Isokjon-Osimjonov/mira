import { Router } from 'express'
import * as ctrl from './exchange-rates.controller'
import { requirePermission } from '../../middleware/auth'

const publicRouter = Router()
const adminRouter = Router()

// Public
publicRouter.get('/current', ctrl.getCurrentRate)
publicRouter.get('/latest', ctrl.getLatest)

// Admin
adminRouter.get('/', requirePermission('exchange_rates', 'read'), ctrl.getHistory)
adminRouter.get('/live', requirePermission('exchange_rates', 'read'), ctrl.getLatest)
adminRouter.post('/', requirePermission('exchange_rates', 'write'), ctrl.createManual)
adminRouter.post('/fetch', requirePermission('exchange_rates', 'write'), ctrl.fetchAuto)

export { publicRouter as exchangeRateRouter, adminRouter as exchangeRateAdminRouter }
