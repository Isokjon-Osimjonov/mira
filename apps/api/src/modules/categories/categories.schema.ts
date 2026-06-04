import { z } from 'zod'

export const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Nomini kiriting'),
  slug: z.string().optional(),
  imageUrl: z.string().optional().nullable(),
  parentId: z.string().uuid("Parent ID noto'g'ri formatda").optional().nullable(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
})

export const UpdateCategorySchema = CreateCategorySchema.partial()

export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>
export type UpdateCategoryDto = z.infer<typeof UpdateCategorySchema>
