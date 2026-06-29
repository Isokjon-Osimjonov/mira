import { z } from 'zod'
export declare const RegionSchema: z.ZodEnum<{
  UZB: 'UZB'
  KOR: 'KOR'
}>
export type Region = z.infer<typeof RegionSchema>
export declare const ApiResponseSchema: <T extends z.ZodType>(
  data: T
) => z.ZodObject<
  {
    data: T
    error: z.ZodNull
    meta: z.ZodOptional<z.ZodAny>
  },
  z.core.$strip
>
export declare const ApiErrorSchema: z.ZodObject<
  {
    data: z.ZodNull
    error: z.ZodObject<
      {
        message: z.ZodString
        code: z.ZodOptional<z.ZodString>
      },
      z.core.$strip
    >
  },
  z.core.$strip
>
//# sourceMappingURL=common.d.ts.map
