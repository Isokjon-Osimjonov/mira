import { Router } from 'express'
import { requireAdmin, requireSuperAdmin } from '../../middleware/auth'
import { backupDatabase } from '../../config/cron'
import { db } from '../../config/db'
import { orders, products, customers, coupons } from '@mira/db'
import { ilike, or, desc, sql, eq } from 'drizzle-orm'

const router = Router()

router.get('/search', requireAdmin, async (req, res) => {
  try {
    const q = String(req.query.q ?? '').trim()
    if (q.length < 2) {
      return res.json({ data: [], error: null })
    }

    const searchPattern = `%${q}%`

    const [foundOrders, foundProducts, foundCustomers, foundCoupons] = await Promise.all([
      // Orders by number
      db
        .select({
          id: orders.id,
          type: sql<string>`'order'`,
          title: orders.orderNumber,
          sub: orders.status,
          link: sql<string>`'/orders/' || ${orders.id}`,
        })
        .from(orders)
        .where(ilike(orders.orderNumber, searchPattern))
        .orderBy(desc(orders.createdAt))
        .limit(3),

      // Products by name/barcode
      db
        .select({
          id: products.id,
          type: sql<string>`'product'`,
          title: products.name,
          sub: products.barcode,
          link: sql<string>`'/products'`,
        })
        .from(products)
        .where(or(ilike(products.name, searchPattern), ilike(products.barcode, searchPattern)))
        .orderBy(desc(products.createdAt))
        .limit(3),

      // Customers by name/phone
      db
        .select({
          id: customers.id,
          type: sql<string>`'customer'`,
          title: sql<string>`${customers.firstName} || ' ' || COALESCE(${customers.lastName}, '')`,
          sub: customers.phone,
          link: sql<string>`'/customers/' || ${customers.id}`,
        })
        .from(customers)
        .where(
          or(
            ilike(customers.firstName, searchPattern),
            ilike(customers.lastName, searchPattern),
            ilike(customers.phone, searchPattern)
          )
        )
        .orderBy(desc(customers.createdAt))
        .limit(3),

      // Coupons by code
      db
        .select({
          id: coupons.id,
          type: sql<string>`'coupon'`,
          title: coupons.code,
          sub: coupons.type,
          link: sql<string>`'/coupons'`,
        })
        .from(coupons)
        .where(ilike(coupons.code, searchPattern))
        .orderBy(desc(coupons.createdAt))
        .limit(3),
    ])

    const results = [...foundOrders, ...foundProducts, ...foundCustomers, ...foundCoupons]

    res.json({ data: results, error: null })
  } catch (err: any) {
    res.status(500).json({ data: null, error: { message: err.message, code: 'INTERNAL_ERROR' } })
  }
})

router.post('/backup/trigger', requireSuperAdmin, async (req, res) => {
  try {
    await backupDatabase()
    res.json({ data: { success: true }, error: null })
  } catch (err: any) {
    res.status(500).json({ data: null, error: { message: err.message, code: 'INTERNAL_ERROR' } })
  }
})

export default router
