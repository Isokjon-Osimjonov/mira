import { z } from 'zod'

export const createExpenseCategorySchema = z.object({
  name: z.string().min(2, 'Kategoriya nomi kamida 2 ta belgi bo\'lishi kerak').max(100),
  slug: z.string().min(2).max(100),
  icon: z.string().optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
})

export const updateExpenseCategorySchema = createExpenseCategorySchema.partial()

export const createExpenseSchema = z.object({
  categoryId: z.string().uuid(),
  amountKrw: z.coerce.number().positive('Summa noldan katta bo\'lishi kerak'),
  description: z.string().min(3, 'Izoh kamida 3 ta belgi bo\'lishi kerak'),
  expenseDate: z.string().date(),
  receiptUrl: z.string().url().optional().nullable(),
})

export const updateExpenseSchema = createExpenseSchema.partial()

export type CreateExpenseCategoryDto = z.infer<typeof createExpenseCategorySchema>
export type UpdateExpenseCategoryDto = z.infer<typeof updateExpenseCategorySchema>
export type CreateExpenseDto = z.infer<typeof createExpenseSchema>
export type UpdateExpenseDto = z.infer<typeof updateExpenseSchema>
