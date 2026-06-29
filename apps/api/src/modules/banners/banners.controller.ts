import type { Request, Response } from 'express'
import * as service from './banners.service'

export async function getPublicBanners(req: Request, res: Response) {
  try {
    const region = (req as any).user?.region as 'UZB' | 'KOR' | undefined
    const items = await service.getActiveBanners(region)
    return res.json({ data: items, error: null })
  } catch (e: any) {
    return res.status(500).json({
      data: null,
      error: { message: e.message },
    })
  }
}

export async function adminGetBanners(_req: Request, res: Response) {
  try {
    const items = await service.getAllBanners()
    return res.json({ data: items, error: null })
  } catch (e: any) {
    return res.status(500).json({
      data: null,
      error: { message: e.message },
    })
  }
}

export async function adminCreateBanner(req: Request, res: Response) {
  try {
    const data = req.body
    const item = await service.createBanner(data)
    return res.status(201).json({ data: item, error: null })
  } catch (e: any) {
    return res.status(e.status ?? 500).json({
      data: null,
      error: { message: e.message },
    })
  }
}

export async function adminUpdateBanner(req: Request, res: Response) {
  try {
    const item = await service.updateBanner(req.params.id, req.body)
    return res.json({ data: item, error: null })
  } catch (e: any) {
    return res.status(e.status ?? 500).json({
      data: null,
      error: { message: e.message },
    })
  }
}

export async function adminDeleteBanner(req: Request, res: Response) {
  try {
    await service.deleteBanner(req.params.id)
    return res.json({ data: { success: true }, error: null })
  } catch (e: any) {
    return res.status(e.status ?? 500).json({
      data: null,
      error: { message: e.message },
    })
  }
}
