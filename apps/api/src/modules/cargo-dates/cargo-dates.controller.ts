import type { Request, Response } from 'express'
import * as service from './cargo-dates.service'

export async function getPublicCargoDates(req: Request, res: Response) {
  try {
    const items = await service.getUpcomingCargoDates()
    return res.json({ data: items, error: null })
  } catch (e: any) {
    return res.status(500).json({ data: null, error: { message: e.message } })
  }
}

export async function adminGetCargoDates(_req: Request, res: Response) {
  try {
    const items = await service.getAllCargoDates()
    return res.json({ data: items, error: null })
  } catch (e: any) {
    return res.status(500).json({ data: null, error: { message: e.message } })
  }
}

export async function adminCreateCargoDate(req: Request, res: Response) {
  try {
    const { cargoDate, note } = req.body
    if (!cargoDate) {
      return res.status(400).json({
        data: null,
        error: { message: 'Sana majburiy' },
      })
    }
    const item = await service.createCargoDate({ cargoDate, note })
    return res.status(201).json({ data: item, error: null })
  } catch (e: any) {
    return res.status(e.status ?? 500).json({
      data: null,
      error: { message: e.message },
    })
  }
}

export async function adminUpdateCargoDate(req: Request, res: Response) {
  try {
    const item = await service.updateCargoDate(req.params.id, req.body)
    return res.json({ data: item, error: null })
  } catch (e: any) {
    return res.status(e.status ?? 500).json({
      data: null,
      error: { message: e.message },
    })
  }
}

export async function adminDeleteCargoDate(req: Request, res: Response) {
  try {
    await service.deleteCargoDate(req.params.id)
    return res.json({ data: { success: true }, error: null })
  } catch (e: any) {
    return res.status(e.status ?? 500).json({
      data: null,
      error: { message: e.message },
    })
  }
}
