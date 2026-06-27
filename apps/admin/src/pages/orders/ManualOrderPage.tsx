import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Loader2, Save, Plus, X, Search } from 'lucide-react'
import { toast } from 'sonner'
import { ordersApi } from '../../api/orders.api'
import { customersApi } from '../../api/customers.api'
import { productsApi } from '../../api/products.api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getErrorMessage } from '../../lib/errors'

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
  })

type ManualOrderForm = {
  customerId: string
  addressId?: string
  paymentMethod: 'KOREAN_BANK' | 'UZB_BANK' | 'E9PAY'
  paymentMode: 'RECEIPT' | 'IMMEDIATE'
  orderDiscountPct?: number
  orderDiscountFlat?: number
  boxId?: string
  couponCode?: string
  adminNote?: string
  items: {
    productId: string
    productName: string
    quantity: number
    negotiatedPriceKrw?: number
  }[]
}

export function ManualOrderPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<any[]>([])
  
  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState<any[]>([])

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ManualOrderForm>({
    resolver: zodResolver(manualOrderSchema) as any,
    defaultValues: {
      customerId: '',
      paymentMethod: 'KOREAN_BANK',
      paymentMode: 'RECEIPT',
      items: [{ productId: '', productName: '', quantity: 1 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const selectedCustomerId = watch('customerId')
  
  // Fetch specific customer to get addresses (optional, since addressId is optional)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)

  useEffect(() => {
    if (!customerSearch || customerSearch.length < 2) {
      setCustomerResults([])
      return
    }
    const t = setTimeout(async () => {
      try {
        const res = await customersApi.list({ search: customerSearch, limit: 5 })
        setCustomerResults(res.data ?? [])
      } catch { /* ignore */ }
    }, 300)
    return () => clearTimeout(t)
  }, [customerSearch])

  useEffect(() => {
    if (!productSearch || productSearch.length < 2) {
      setProductResults([])
      return
    }
    const t = setTimeout(async () => {
      try {
        const res = await productsApi.list({ q: productSearch, limit: 5 })
        setProductResults(res.data ?? [])
      } catch { /* ignore */ }
    }, 300)
    return () => clearTimeout(t)
  }, [productSearch])

  const mutation = useMutation({
    mutationFn: (data: ManualOrderForm) => {
      const payload = {
        ...data,
        orderDiscountPct: data.orderDiscountPct ?? undefined,
        orderDiscountFlat: data.orderDiscountFlat ?? undefined,
        items: data.items.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          negotiatedPriceKrw: i.negotiatedPriceKrw ? Number(i.negotiatedPriceKrw) : undefined,
        })),
      }
      return ordersApi.adminCreate(payload)
    },
    onSuccess: () => {
      qc.removeQueries()
      toast.success('Buyurtma muvaffaqiyatli yaratildi')
      navigate({ to: '/orders' } as any)
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err?.errorCode ?? err?.response?.data?.error?.code ?? ''))
    },
  })

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-20">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/orders' } as any)}
          className="rounded-lg h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold text-gray-900">Yangi buyurtma (Manual)</h1>
      </div>

      <form
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        className="bg-white rounded-xl border-[0.5px] border-border p-6 shadow-sm space-y-8"
      >
        {/* MIJOZ TANLASH */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold border-b pb-2">1. Mijoz ma'lumotlari</h2>
          <div className="space-y-1.5 relative">
            <Label className="text-xs">Mijoz qidirish *</Label>
            {!selectedCustomerId ? (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Ism, telefon orqali..."
                  className="pl-9 h-9"
                />
                {customerResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b last:border-0"
                        onClick={() => {
                          setValue('customerId', c.id)
                          setSelectedCustomer(c)
                          setCustomerSearch('')
                          setCustomerResults([])
                        }}
                      >
                        <div className="font-medium">{c.firstName} {c.lastName}</div>
                        <div className="text-xs text-muted-foreground">{c.phone || 'Telfonsiz'}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                <div>
                  <div className="font-medium text-sm">{selectedCustomer?.firstName} {selectedCustomer?.lastName}</div>
                  <div className="text-xs text-muted-foreground">{selectedCustomer?.phone}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setValue('customerId', '')
                    setSelectedCustomer(null)
                  }}
                >
                  O'zgartirish
                </Button>
              </div>
            )}
            {errors.customerId && <p className="text-xs text-red-500">{errors.customerId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Manzil (Address ID) - Ixtiyoriy</Label>
            <Input {...register('addressId')} placeholder="Manzil UUID agar mavjud bo'lsa" className="h-9" />
          </div>
        </div>

        {/* MAHSULOTLAR */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold border-b pb-2">2. Mahsulotlar</h2>
          
          <div className="space-y-1.5 relative">
            <Label className="text-xs">Mahsulot qo'shish</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Mahsulot nomi bilan qidiring..."
                className="pl-9 h-9"
              />
              {productResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {productResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b last:border-0"
                      onClick={() => {
                        append({ productId: p.id, productName: p.name || p.nameKo || 'Nomsiz', quantity: 1 })
                        setProductSearch('')
                        setProductResults([])
                      }}
                    >
                      <div className="font-medium">{p.name || p.nameKo}</div>
                      <div className="text-xs text-muted-foreground">{p.priceKrw} KRW</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {fields.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Nomi</th>
                    <th className="px-3 py-2 text-left font-medium w-24">Soni</th>
                    <th className="px-3 py-2 text-left font-medium w-32">Kelishilgan narx (KRW)</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, idx) => (
                    <tr key={field.id} className="border-b last:border-0">
                      <td className="px-3 py-2">{field.productName}</td>
                      <td className="px-3 py-2">
                        <Input type="number" {...register(`items.${idx}.quantity` as const)} className="h-8" />
                      </td>
                      <td className="px-3 py-2">
                        <Input type="number" {...register(`items.${idx}.negotiatedPriceKrw` as const)} className="h-8" placeholder="Ixtiyoriy" />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button type="button" onClick={() => remove(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                          <X className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center p-4 border rounded-lg border-dashed">
              Hali mahsulot qo'shilmadi
            </div>
          )}
          {errors.items?.message && <p className="text-xs text-red-500">{errors.items.message}</p>}
        </div>

        {/* TO'LOV VA QO'SHIMCHA */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold border-b pb-2">3. To'lov va Chegirma</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">To'lov usuli *</Label>
              <Controller
                name="paymentMethod"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KOREAN_BANK">Koreya Banki (KOR)</SelectItem>
                      <SelectItem value="UZB_BANK">O'zbekiston Banki (UZB)</SelectItem>
                      <SelectItem value="E9PAY">E9PAY</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To'lov holati</Label>
              <Controller
                name="paymentMode"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RECEIPT">Kvitansiya kutilmoqda</SelectItem>
                      <SelectItem value="IMMEDIATE">Darhol to'langan</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Chegirma foizi (%)</Label>
              <Input type="number" {...register('orderDiscountPct')} className="h-9" placeholder="0-100" />
              {errors.orderDiscountPct && <p className="text-xs text-red-500">{errors.orderDiscountPct.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Chegirma summasi (KRW)</Label>
              <Input type="number" {...register('orderDiscountFlat')} className="h-9" placeholder="Masalan: 5000" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Kupon kodi (Ixtiyoriy)</Label>
            <Input {...register('couponCode')} className="h-9" placeholder="YANGI_YIL" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Admin izohi (Ixtiyoriy)</Label>
            <textarea
              {...register('adminNote')}
              className="w-full min-h-[80px] rounded-lg border-[0.5px] border-border p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Faqat adminlar uchun eslatma..."
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-lg h-10"
            onClick={() => navigate({ to: '/orders' } as any)}
          >
            Bekor qilish
          </Button>
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 rounded-lg h-10 gap-2"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Buyurtma yaratish
          </Button>
        </div>
      </form>
    </div>
  )
}
