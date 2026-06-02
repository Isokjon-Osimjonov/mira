import { z } from 'zod'

export const scanBarcodeSchema = z.object({
  barcodeInput: z.string().trim().min(1, 'Barcode kiritilmadi'),
  orderItemId: z.string().uuid().optional(),
})

export const manualConfirmSchema = z.object({
  note: z.string().optional(),
})

export type ScanBarcodeDto = z.infer<typeof scanBarcodeSchema>
export type ManualConfirmDto = z.infer<typeof manualConfirmSchema>
