import { z } from 'zod';

const manualOrderSchema = z
  .object({
    customerId: z.string().uuid('Mijozni tanlang'),
    addressId: z.string().uuid().optional(),
    paymentMethod: z.enum(['KOREAN_BANK', 'UZB_BANK', 'E9PAY'], {
      message: "To'lov turini tanlang",
    }),
    paymentMode: z.enum(['RECEIPT', 'IMMEDIATE']).default('RECEIPT'),
    orderDiscountPct: z.coerce.number().int().min(0).max(100).optional(),
    orderDiscountFlat: z.coerce.number().int().min(0).optional(),
    boxId: z.string().uuid().optional(),
    couponCode: z.string().trim().toUpperCase().optional(),
    adminNote: z.string().optional(),
    items: z
      .array(
        z.object({
          productId: z.string().uuid('Mahsulot tanlang'),
          productName: z.string(),
          quantity: z.coerce.number().int().positive('Kamida 1 ta'),
          negotiatedPriceKrw: z.coerce.number().min(0).optional(),
        })
      )
      .min(1, "Kamida bitta mahsulot qo'shing"),
  })
  .refine((d) => !(d.orderDiscountPct && d.orderDiscountFlat), {
    message: 'Faqat bir tur chegirma tanlang (foiz yoki summa)',
    path: ['orderDiscountPct'],
  });

try {
  const result = manualOrderSchema.parse({
    customerId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // Dummy UUID
    paymentMethod: 'UZB_BANK',
    paymentMode: 'RECEIPT',
    items: [
      {
        productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // Test product UUID
        productName: 'Test Product',
        quantity: 1,
        negotiatedPriceKrw: 15000
      }
    ]
  });
  console.log("PAYLOAD VALIDATION SUCCESS");
  console.log(JSON.stringify(result, null, 2));
} catch(e) {
  console.log("PAYLOAD VALIDATION FAILED");
  console.error(e);
}
