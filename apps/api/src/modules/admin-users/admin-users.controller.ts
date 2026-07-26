import type { Request, Response } from 'express'
import { db } from '../../config/db'
import { adminUsers } from '@mira/db'
import { eq } from 'drizzle-orm'
import * as service from './admin-users.service'
import { createAdminUserSchema, updateAdminUserSchema } from './admin-users.schema'

export async function getAdminUsers(req: Request, res: Response) {
  try {
    const page = req.query.page ? Number(req.query.page) : undefined
    const limit = req.query.limit ? Number(req.query.limit) : undefined
    const data = await service.getAdminUsers({ page, limit })
    return res.json({ data: data.items, meta: data.meta, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getAdminUserById(req: Request, res: Response) {
  try {
    const data = await service.getAdminUserById(req.params.id)
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function createAdminUser(req: Request, res: Response) {
  try {
    const validated = createAdminUserSchema.parse(req.body)
    const data = await service.createAdminUser(validated)
    // Exclude sensitive fields
    const { passwordHash, ...safeData } = data as any
    return res.json({ data: safeData, error: null })
  } catch (e: any) {
    if (e.name === 'ZodError')
      return res.status(400).json({
        data: null,
        error: { message: "Ma'lumotlar noto'g'ri", code: 'VALIDATION_ERROR', details: e.errors },
      })
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function updateAdminUser(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { roleId, isActive, email, isSuperAdmin } = req.body

    const updateData: any = {
      updatedAt: new Date(),
    }

    if (roleId !== undefined) updateData.roleId = roleId
    if (isActive !== undefined) updateData.isActive = isActive
    if (email !== undefined) updateData.email = email
    if (isSuperAdmin !== undefined) updateData.isSuperAdmin = isSuperAdmin

    const [updated] = await db
      .update(adminUsers)
      .set(updateData)
      .where(eq(adminUsers.id, id))
      .returning()

    return res.json({
      data: updated,
      error: null,
    })
  } catch (e: any) {
    return res.status(e.status ?? 500).json({
      data: null,
      error: {
        message: e.message,
        code: e.code ?? 'INTERNAL_ERROR',
      },
    })
  }
}

export async function updateAdminUserStatus(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { isActive, roleId } = req.body

    const updated = await service.updateAdminUserStatus(id, { isActive, roleId })

    return res.json({
      data: updated,
      error: null,
    })
  } catch (e: any) {
    return res.status(e.status ?? 500).json({
      data: null,
      error: {
        message: e.message,
        code: e.code ?? 'INTERNAL_ERROR',
      },
    })
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const data = await service.resetAdminPassword(req.params.id)
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function deleteAdminUser(req: Request, res: Response) {
  try {
    const adminId = (req.user as any).sub
    const data = await service.deleteAdminUser(adminId, req.params.id)
    return res.json({ data: { id: data.id }, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}
