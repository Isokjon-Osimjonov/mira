import type { Request, Response } from 'express'
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
      return res
        .status(400)
        .json({
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
        unitPriceSnapshot: Number(item.unitPriceSnapshot),
        subtotalSnapshot: Number(item.subtotalSnapshot),
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

    const data = await service.getInvoiceData(orderId, userId, isAdmin)
    const { generateInvoicePDF } = await import('../../lib/invoice')
    generateInvoicePDF(data, res)
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
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

    const result = await service.adminGetOrders({ page, limit, status, region, search })
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
        unitPriceSnapshot: Number(item.unitPriceSnapshot),
        subtotalSnapshot: Number(item.subtotalSnapshot),
        costAtSaleKrw: item.costAtSaleKrw ? Number(item.costAtSaleKrw) : null,
      })),
      expenses: data.expenses.map((exp) => ({
        ...exp,
        amountKrw: Number(exp.amountKrw),
      })),
    }

    return res.json({ data: safeData, error: null })
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
      return res
        .status(400)
        .json({
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
    const adminId = (req.user as any).sub
    const data = await service.confirmPayment(req.params.id, adminId, validated)
    return res.json({ data: { id: data.id, status: data.status }, error: null })
  } catch (e: any) {
    if (e.name === 'ZodError')
      return res
        .status(400)
        .json({
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
    const adminId = (req.user as any).sub
    const data = await service.rejectPayment(req.params.id, adminId, validated)
    return res.json({ data: { id: data.id, status: data.status }, error: null })
  } catch (e: any) {
    if (e.name === 'ZodError')
      return res
        .status(400)
        .json({
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
    const adminId = (req.user as any).sub
    const data = await service.startPacking(req.params.id, adminId)
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
    const adminId = (req.user as any).sub
    const data = await service.shipOrder(req.params.id, adminId, validated)
    return res.json({ data: { id: data.id, status: data.status }, error: null })
  } catch (e: any) {
    if (e.name === 'ZodError')
      return res
        .status(400)
        .json({
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
      return res
        .status(400)
        .json({
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
      return res
        .status(400)
        .json({
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
      return res
        .status(400)
        .json({
          data: null,
          error: { message: 'Xato', code: 'VALIDATION_ERROR', details: e.errors },
        })
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}
