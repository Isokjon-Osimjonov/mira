import type { Request, Response, NextFunction } from 'express'
import { db } from '../../config/db'
import {
  orders,
  orderItems,
  products,
  productRegionalConfigs,
  customers,
  exchangeRateSnapshots,
  couponRedemptions,
  coupons,
} from '@mira/db'
import { eq, and, sql } from 'drizzle-orm'
import * as service from './orders.service'
import {
  checkoutSchema,
  uploadReceiptSchema,
  manualOrderSchema,
  confirmPaymentSchema,
  rejectPaymentSchema,
  shipOrderSchema,
  cancelOrderSchema,
  refundOrderSchema,
  addExpenseSchema,
  requestRefundSchema,
} from './orders.schema'
import type { CustomerJwtPayload, AdminJwtPayload } from '../../middleware/auth'

// ─── Customer Endpoints ──────────────────────────────────────────────────

export async function checkout(req: Request, res: Response) {
  try {
    const validated = checkoutSchema.parse(req.body)
    const customerId = (req.user as any).sub
    const region = (req.user as any).region

    const data = await service.checkoutCart(customerId, region, validated)

    const safeData = {
      order: {
        ...data.order,
        totalAmount: Number(data.order.totalAmount),
      },
      paymentInfo: data.paymentInfo,
    }

    return res.json({ data: safeData, error: null })
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({
        data: null,
        error: { message: "Ma'lumotlar noto'g'ri", code: 'VALIDATION_ERROR', details: e.errors },
      })
    }
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getCustomerOrders(req: Request, res: Response) {
  try {
    const customerId = (req.user as any).sub
    const page = req.query.page ? Number(req.query.page) : undefined
    const limit = req.query.limit ? Number(req.query.limit) : undefined
    const status = req.query.status as string | undefined
    const search = req.query.search as string | undefined

    const result = await service.getCustomerOrders(customerId, { page, limit, status, search })

    return res.json({ data: result.items, meta: result.meta, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getStatusCounts(_req: Request, res: Response) {
  try {
    const data = await service.getOrderStatusCounts()
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getCustomerOrderDetail(req: Request, res: Response) {
  try {
    const customerId = (req.user as any).sub
    const data = await service.getCustomerOrderDetail(req.params.id, customerId)

    const safeData = {
      ...data,
      subtotal: Number(data.subtotal),
      discountAmount: Number(data.discountAmount),
      cargoFee: Number(data.cargoFee),
      totalAmount: Number(data.totalAmount),
      paymentAmount: data.paymentAmount ? Number(data.paymentAmount) : null,
      paymentAmountUzs: data.paymentAmountUzs ? Number(data.paymentAmountUzs) : null,
      deliveryFeeCharged: Number(data.deliveryFeeCharged),
      deliveryFeeActual: data.deliveryFeeActual ? Number(data.deliveryFeeActual) : null,
      refundAmount: data.refundAmount ? Number(data.refundAmount) : null,
      boxPriceSnapshot: data.boxPriceSnapshot ? Number(data.boxPriceSnapshot) : null,
      items: data.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
      })),
    }

    return res.json({ data: safeData, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function uploadReceipt(req: Request, res: Response) {
  try {
    const validated = uploadReceiptSchema.parse(req.body)
    const customerId = (req.user as any).sub

    const data = await service.uploadReceipt(req.params.id, customerId, validated)
    return res.json({ data: { id: data.id, status: data.status }, error: null })
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({
        data: null,
        error: { message: "Ma'lumotlar noto'g'ri", code: 'VALIDATION_ERROR', details: e.errors },
      })
    }
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function cancelOrderByCustomer(req: Request, res: Response) {
  try {
    const customerId = (req.user as any).sub
    const { id } = req.params
    const { reason } = req.body
    await service.cancelOrderByCustomer(id, customerId, reason)
    return res.json({ data: { success: true }, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function requestRefund(req: Request, res: Response) {
  try {
    const customerId = (req.user as any).sub
    const { id } = req.params
    const validated = requestRefundSchema.parse(req.body)
    await service.requestRefundByCustomer(id, customerId, validated.reason)
    return res.json({ data: { success: true }, error: null })
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({
        data: null,
        error: { message: "Ma'lumotlar noto'g'ri", code: 'VALIDATION_ERROR', details: e.errors },
      })
    }
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function downloadInvoice(req: Request, res: Response) {
  try {
    const orderId = req.params.id
    const isAdmin = (req.user as any).type === 'admin'
    const userId = (req.user as any).sub

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Topilmadi' }

    if (!isAdmin && order.customerId !== userId) {
      throw { status: 403, code: 'ORDER_UNAUTHORIZED', message: "Ruxsat yo'q" }
    }

    const items = await db
      .select({
        product: {
          name: products.name,
          brandName: products.brandName,
          barcode: products.barcode,
          sku: products.sku,
          imageUrls: products.imageUrls,
        },
        quantity: orderItems.quantity,
        unitPriceSnapshot: orderItems.unitPriceSnapshot,
        subtotalSnapshot: orderItems.subtotalSnapshot,
        isWholesale: sql<boolean>`${orderItems.quantity} >= ${productRegionalConfigs.minWholesaleQty}`,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .innerJoin(
        productRegionalConfigs,
        and(
          eq(productRegionalConfigs.productId, orderItems.productId),
          eq(productRegionalConfigs.regionCode, order.deliveryRegion as any)
        )
      )
      .where(eq(orderItems.orderId, orderId))

    const [customer] = await db.select().from(customers).where(eq(customers.id, order.customerId))

    const [rate] = await db
      .select()
      .from(exchangeRateSnapshots)
      .where(eq(exchangeRateSnapshots.id, order.rateSnapshotId!))
      .limit(1)

    // Get coupon code if used
    const [redemption] = await db
      .select({ code: coupons.code })
      .from(couponRedemptions)
      .innerJoin(coupons, eq(coupons.id, couponRedemptions.couponId))
      .where(eq(couponRedemptions.orderId, order.id))
      .limit(1)

    const invoiceItems = items.map((item) => ({
      productName: item.product.name,
      brandName: item.product.brandName,
      barcode: item.product.barcode,
      sku: item.product.sku ?? '',
      quantity: item.quantity,
      unitPrice: item.unitPriceSnapshot,
      subtotal: item.subtotalSnapshot,
      isWholesale: item.isWholesale ?? false,
      hasCoupon: (order.discountAmount ?? 0n) > 0n,
      imageUrl: item.product.imageUrls?.[0] ?? undefined,
    }))

    const { generateInvoicePDF } = await import('../../lib/invoice')
    await generateInvoicePDF(
      {
        order: {
          orderNumber: order.orderNumber,
          createdAt: order.createdAt,
          paymentConfirmedAt: order.paymentConfirmedAt ?? undefined,
          status: order.status,
          subtotal: order.subtotal ?? order.totalAmount,
          couponDiscount: order.discountAmount ?? 0n,
          orderDiscount: BigInt(order.orderDiscountFlat ?? 0),
          orderDiscountPct: order.orderDiscountPct ?? undefined,
          cargoFee: order.cargoFee ?? 0n,
          totalAmount: order.totalAmount,
          couponCode: redemption?.code ?? undefined,
          regionCode: order.deliveryRegion ?? 'KOR',
        },
        items: invoiceItems,
        customer: {
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
        },
        delivery: {
          fullName: order.deliveryFullName ?? customer.firstName,
          phone: order.deliveryPhone ?? customer.phone,
          addressLine1: order.deliveryAddressLine1 ?? '',
          addressLine2: order.deliveryAddressLine2,
          city: order.deliveryCity,
          province: null, // Not snapshotted in orders table
          postalCode: order.deliveryPostalCode,
          regionCode: order.deliveryRegion ?? 'KOR',
        },
        exchangeRate: rate ? { krwToUzs: Number(rate.krwToUzs) } : undefined,
      },
      res
    )
  } catch (e: any) {
    if (!res.headersSent) {
      res.status(e.status ?? 500).json({
        data: null,
        error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' },
      })
    }
  }
}

// ─── Admin Endpoints ─────────────────────────────────────────────────────

export async function adminGetOrders(req: Request, res: Response) {
  try {
    const page = req.query.page ? Number(req.query.page) : undefined
    const limit = req.query.limit ? Number(req.query.limit) : undefined
    const status = req.query.status as string | undefined
    const region = req.query.region as string | undefined
    const search = req.query.search as string | undefined
    const shippedDate = req.query.shippedDate as string | undefined

    const result = await service.adminGetOrders({
      page,
      limit,
      status,
      region,
      search,
      shippedDate,
    })
    return res.json({ data: result.items, meta: result.meta, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function adminGetOrderDetail(req: Request, res: Response) {
  try {
    const data = await service.adminGetOrderDetail(req.params.id)
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function adminUpdateStatus(req: Request, res: Response) {
  try {
    const { id } = req.params
    const admin = req.user as any
    const payload = req.body // { status, note, trackingNumber }
    const data = await service.adminUpdateStatus(id, admin?.sub, payload, admin?.fullName)
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function adminCreateOrder(req: Request, res: Response) {
  try {
    const validated = manualOrderSchema.parse(req.body)
    const adminId = (req.user as any).sub

    const data = await service.adminCreateOrder(adminId, validated)

    const safeData = {
      order: {
        ...data.order,
        totalAmount: Number(data.order.totalAmount),
      },
      paymentInfo: data.paymentInfo,
    }

    return res.json({ data: safeData, error: null })
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({
        data: null,
        error: { message: "Ma'lumotlar noto'g'ri", code: 'VALIDATION_ERROR', details: e.errors },
      })
    }
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function confirmPayment(req: Request, res: Response) {
  try {
    const validated = confirmPaymentSchema.parse(req.body)
    const admin = req.user as any
    const data = await service.confirmPayment(req.params.id, admin?.sub, validated, admin?.fullName)
    return res.json({ data, error: null })
  } catch (e: any) {
    if (e.name === 'ZodError')
      return res.status(400).json({
        data: null,
        error: { message: 'Xato', code: 'VALIDATION_ERROR', details: e.errors },
      })
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function rejectPayment(req: Request, res: Response) {
  try {
    const validated = rejectPaymentSchema.parse(req.body)
    const admin = req.user as any
    const data = await service.rejectPayment(req.params.id, admin?.sub, validated, admin?.fullName)
    return res.json({ data: { id: data.id, status: data.status }, error: null })
  } catch (e: any) {
    if (e.name === 'ZodError')
      return res.status(400).json({
        data: null,
        error: { message: 'Xato', code: 'VALIDATION_ERROR', details: e.errors },
      })
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function startPacking(req: Request, res: Response) {
  try {
    const admin = req.user as any
    const data = await service.startPacking(req.params.id, admin?.sub, admin?.fullName)
    return res.json({ data: { id: data.id, status: data.status }, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function shipOrder(req: Request, res: Response) {
  try {
    const validated = shipOrderSchema.parse(req.body)
    const admin = req.user as any
    const data = await service.shipOrder(req.params.id, admin?.sub, validated, admin?.fullName)
    return res.json({ data: { id: data.id, status: data.status }, error: null })
  } catch (e: any) {
    if (e.name === 'ZodError')
      return res.status(400).json({
        data: null,
        error: { message: 'Xato', code: 'VALIDATION_ERROR', details: e.errors },
      })
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function deliverOrder(req: Request, res: Response) {
  try {
    const adminId = (req.user as any).sub
    const data = await service.deliverOrder(req.params.id, adminId)
    return res.json({ data: { id: data.id, status: data.status }, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function cancelOrder(req: Request, res: Response) {
  try {
    const validated = cancelOrderSchema.parse(req.body)
    const adminId = (req.user as any).sub
    const data = await service.cancelOrder(req.params.id, adminId, validated.reason)
    return res.json({ data: { id: data.id, status: data.status }, error: null })
  } catch (e: any) {
    if (e.name === 'ZodError')
      return res.status(400).json({
        data: null,
        error: { message: 'Xato', code: 'VALIDATION_ERROR', details: e.errors },
      })
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function refundOrder(req: Request, res: Response) {
  try {
    const validated = refundOrderSchema.parse(req.body)
    const adminId = (req.user as any).sub
    const data = await service.refundOrder(req.params.id, adminId, validated)
    return res.json({ data: { id: data.id, status: data.status }, error: null })
  } catch (e: any) {
    if (e.name === 'ZodError')
      return res.status(400).json({
        data: null,
        error: { message: 'Xato', code: 'VALIDATION_ERROR', details: e.errors },
      })
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getOrderExpenses(req: Request, res: Response) {
  try {
    const data = await service.getOrderExpenses(req.params.id)

    const safeData = {
      expenses: data.expenses.map((exp) => ({ ...exp, amountKrw: Number(exp.amountKrw) })),
      profitSummary: data.profitSummary,
    }

    return res.json({ data: safeData, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function addOrderExpense(req: Request, res: Response) {
  try {
    const validated = addExpenseSchema.parse(req.body)
    const adminId = (req.user as any).sub
    const data = await service.addOrderExpense(req.params.id, adminId, validated)

    const safeData = { ...data, amountKrw: Number(data.amountKrw) }
    return res.json({ data: safeData, error: null })
  } catch (e: any) {
    if (e.name === 'ZodError')
      return res.status(400).json({
        data: null,
        error: { message: 'Xato', code: 'VALIDATION_ERROR', details: e.errors },
      })
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function scanOrderItem(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { barcode } = req.body
    if (!barcode) {
      return res.status(400).json({
        data: null,
        error: { message: 'Barkod kiriting', code: 'MISSING_BARCODE' },
      })
    }
    const result = await service.scanOrderItem(id, barcode)
    return res.json({ data: result, error: null })
  } catch (e: any) {
    return res.status(e.status ?? 500).json({
      data: null,
      error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' },
    })
  }
}

export async function updateDeliveryEstimate(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { estimatedDeliveryStart, estimatedDeliveryEnd } = req.body

    const [updated] = await db
      .update(orders)
      .set({ estimatedDeliveryStart, estimatedDeliveryEnd })
      .where(eq(orders.id, id))
      .returning()

    if (!updated) {
      return res.status(404).json({
        data: null,
        error: { message: 'Buyurtma topilmadi' },
      })
    }

    return res.json({ data: updated, error: null })
  } catch (e: any) {
    return res.status(500).json({
      data: null,
      error: { message: e.message },
    })
  }
}
