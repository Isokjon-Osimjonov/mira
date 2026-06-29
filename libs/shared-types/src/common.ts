import { z } from 'zod'

export const RegionSchema = z.enum(['UZB', 'KOR'])
export type Region = z.infer<typeof RegionSchema>

export const ApiResponseSchema = <T extends z.ZodType>(data: T) =>
  z.object({ data, error: z.null(), meta: z.any().optional() })

export const ApiErrorSchema = z.object({
  data: z.null(),
  error: z.object({ message: z.string(), code: z.string().optional() }),
})
