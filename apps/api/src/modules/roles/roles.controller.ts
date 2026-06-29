import type { Request, Response } from 'express'
import * as service from './roles.service'
import { createRoleSchema, updateRoleSchema, updatePermissionSchema } from './roles.schema'

export async function getRoles(_req: Request, res: Response) {
  try {
    const data = await service.getRoles()
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getPermissionMatrix(_req: Request, res: Response) {
  try {
    const data = await service.getPermissionMatrix()
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getRoleById(req: Request, res: Response) {
  try {
    const data = await service.getRoleById(req.params.id)
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function createRole(req: Request, res: Response) {
  try {
    const validated = createRoleSchema.parse(req.body)
    const data = await service.createRole(validated)
    return res.json({ data, error: null })
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

export async function updateRole(req: Request, res: Response) {
  try {
    const validated = updateRoleSchema.parse(req.body)
    const data = await service.updateRole(req.params.id, validated)
    return res.json({ data, error: null })
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

export async function updateGranularPermission(req: Request, res: Response) {
  try {
    const validated = updatePermissionSchema.parse(req.body)
    await service.updateGranularPermission(req.params.id, validated)
    return res.json({ data: { success: true }, error: null })
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

export async function deleteRole(req: Request, res: Response) {
  try {
    const data = await service.deleteRole(req.params.id)
    return res.json({ data: { id: data.id }, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}
