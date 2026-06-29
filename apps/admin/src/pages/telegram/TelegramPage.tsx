import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Send,
  Clock,
  Trash2,
  RefreshCw,
  Sparkles,
  Eye,
  History,
  Radio,
  Phone,
  Check,
  Image as ImageIcon,
  Plus,
  X,
  Package,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { telegramApi } from '../../api/telegram.api'
import { productsApi } from '../../api/products.api'
import { QK } from '../../constants/query-keys'
import { formatKRW, formatUZS } from '../../utils/currency'
import { formatDateTime, formatRelative } from '../../utils/date'
import { getErrorMessage } from '../../lib/errors'
import { useExchangeRate } from '../../hooks/useExchangeRate'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleSwitch } from '../../components/ui/ToggleSwitch'
import { api } from '../../lib/api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

const POST_STATUS_LABELS: Record<string, any> = {
  SENT: { label: 'Yuborildi', color: 'text-green-600 bg-green-50' },
  SCHEDULED: { label: 'Rejalashtirilgan', color: 'text-blue-600 bg-blue-50' },
  FAILED: { label: 'Xato', color: 'text-red-600 bg-red-50' },
  DELETED: { label: "O'chirildi", color: 'text-gray-500 bg-gray-100' },
  DRAFT: { label: 'Qoralama', color: 'text-amber-600 bg-amber-50' },
}

const postSchema = z.object({
  productId: z.string().min(1, 'Mahsulot tanlang'),
  channelId: z.string().min(1, 'Kanal tanlang'),
  caption: z.string().min(1, 'Matn kiriting'),
  phoneNumber: z.string().optional(),
  sendNow: z.boolean().default(true),
  scheduledAt: z.string().optional(),
})
type PostForm = z.infer<typeof postSchema>

export function TelegramPage() {
  const qc = useQueryClient()
  const { rate: currentRate } = useExchangeRate()

  const [historyTab, setHistoryTab] = useState<'all' | 'SCHEDULED' | 'SENT' | 'FAILED'>('all')
  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState<any[]>([])
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [generatingCaption, setGeneratingCaption] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const LIMIT = 10

  const [addChannelSheet, setAddChannelSheet] = useState(false)
  const [chatId, setChatId] = useState('')
  const [chatName, setChatName] = useState('')

  // Price toggles state
  const [showKorRetail, setShowKorRetail] = useState(true)
  const [showKorWholesale, setShowKorWholesale] = useState(true)
  const [showUzbRetail, setShowUzbRetail] = useState(true)
  const [showUzbWholesale, setShowUzbWholesale] = useState(true)

  // Link states
  const [linksEnabled, setLinksEnabled] = useState([true, true, true])
  const [linkLabels, setLinkLabels] = useState(['Telegram', 'Instagram', 'Website'])
  const [linkUrls, setLinkUrls] = useState(['', '', ''])

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(postSchema),
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    defaultValues: {
      sendNow: true,
    },
  })

  // Load saved settings
  const { data: savedSettings } = useQuery({
    queryKey: ['tg-post-settings'],
    queryFn: async () => {
      const res = await api.get('/admin/telegram/post-settings')
      return res.data.data
    },
    staleTime: Infinity,
  })

  useEffect(() => {
    if (!savedSettings) return
    setValue('phoneNumber', savedSettings.phone ?? '')
    setLinkLabels([
      savedSettings.link1Label ?? 'Telegram',
      savedSettings.link2Label ?? 'Instagram',
      savedSettings.link3Label ?? 'Website',
    ])
    setLinkUrls([
      savedSettings.link1Url ?? '',
      savedSettings.link2Url ?? '',
      savedSettings.link3Url ?? '',
    ])
  }, [savedSettings, setValue])

  const saveSettings = (data?: any) => {
    const payload = data || {
      phone: watchPhone,
      link1Label: linkLabels[0],
      link1Url: linkUrls[0],
      link2Label: linkLabels[1],
      link2Url: linkUrls[1],
      link3Label: linkLabels[2],
      link3Url: linkUrls[2],
    }
    saveSettingsMutation.mutate(payload)
  }

  const saveSettingsMutation = useMutation({
    mutationFn: (data: any) => api.patch('/admin/telegram/post-settings', data).then((r) => r.data),
  })

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.product-search-container')) {
        setProductResults([])
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const watchCaption = watch('caption')
  const watchPhone = watch('phoneNumber')
  const watchSendNow = watch('sendNow')

  // Computed prices
  const rate = Number(currentRate ?? 0)
  const korRetail = Number(selectedProduct?.retailPrice ?? 0)
  const korWholesale = Number(selectedProduct?.wholesalePrice ?? 0)
  const korMinQty = Number(selectedProduct?.minOrderQty ?? 1)
  const uzbRetail = Math.round(korRetail * rate)
  const uzbWholesale = Math.round(korWholesale * rate)
  const uzbMinQty = Number(selectedProduct?.minWholesaleQty ?? 5)

  // Channels
  const { data: channels = [] } = useQuery({
    queryKey: QK.TELEGRAM_CHANNELS,
    queryFn: telegramApi.getChannels,
  })

  const addChannelMutation = useMutation({
    mutationFn: () => telegramApi.addChannel({ chatId, channelName: chatName }),
    onSuccess: () => {
      qc.removeQueries()
      toast.success("Kanal qo'shildi")
      setAddChannelSheet(false)
      setChatId('')
      setChatName('')
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const removeChannelMutation = useMutation({
    mutationFn: (id: string) => telegramApi.removeChannel(id),
    onSuccess: () => {
      qc.removeQueries()
      toast.success("Kanal o'chirildi")
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  // Posts history
  const { data: postsRes, isLoading: postsLoading } = useQuery({
    queryKey: QK.TELEGRAM_POSTS({
      status: historyTab === 'all' ? undefined : historyTab,
      page,
      limit: LIMIT,
    }),
    queryFn: () =>
      telegramApi.getPosts({
        status: historyTab === 'all' ? undefined : historyTab,
        page,
        limit: LIMIT,
      }),
    refetchInterval: 30_000,
  })
  const posts = postsRes?.data ?? []
  const meta = postsRes?.meta

  // Product search
  useEffect(() => {
    if (!productSearch.trim() || productSearch.length < 2 || selectedProduct) {
      if (!selectedProduct) setProductResults([])
      return
    }

    const t = setTimeout(async () => {
      try {
        const res = await productsApi.list({ q: productSearch.trim(), limit: 8 })
        const data = res?.data?.data ?? res?.data ?? []
        setProductResults(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Product search error:', err)
        setProductResults([])
      }
    }, 300)

    return () => clearTimeout(t)
  }, [productSearch, selectedProduct])

  const handleGenerateCaption = async () => {
    if (!selectedProduct) {
      toast.error('Avval mahsulot tanlang')
      return
    }
    setGeneratingCaption(true)
    try {
      const res = await telegramApi.generateCaption({
        productId: selectedProduct.id,
        showRetail: showKorRetail || showUzbRetail,
        showWholesale: showKorWholesale || showUzbWholesale,
        phone: watchPhone,
        language: 'uz',
      })
      setValue('caption', res.caption)
      toast.success('AI matn yaratid ✨')
    } catch (err: any) {
      toast.error('Matn yaratishda xatolik')
    } finally {
      setGeneratingCaption(false)
    }
  }

  const createMutation = useMutation({
    mutationFn: (data: PostForm) => {
      const imageUrls = selectedProduct?.imageUrls ?? []
      return telegramApi.createPost({
        productId: data.productId,
        channelIds: [data.channelId],
        title: selectedProduct?.name || 'Yangi post',
        content: buildCaption(),
        imageUrl: imageUrls[0] || null,
        scheduledAt: data.sendNow
          ? null
          : data.scheduledAt
            ? new Date(data.scheduledAt).toISOString()
            : null,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries()
      toast.success(watchSendNow ? 'Post yuborildi! 🚀' : 'Post rejalashtirildi ✅')

      // Reset form fields
      reset({
        sendNow: true,
        caption: '',
        channelId: '',
        phoneNumber: watchPhone, // Keep phone
        productId: '',
      })

      // Reset manual states
      setSelectedProduct(null)
      setProductSearch('')
      setIsSubmitted(false)

      // Reset price toggles to default
      setShowKorRetail(true)
      setShowKorWholesale(true)
      setShowUzbRetail(true)
      setShowUzbWholesale(true)

      // Channel selection is reset via the form reset above
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => telegramApi.deletePost(id),
    onSuccess: () => {
      qc.removeQueries()
      toast.success("Post o'chirildi")
      setDeleteTarget(null)
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const SEP = '━'.repeat(19)

  const buildCaption = (): string => {
    if (!selectedProduct && !watchCaption) return ''
    const lines: string[] = []

    // Headline from post matni
    if (watchCaption) {
      lines.push(watchCaption)
      lines.push('')
    }

    // Price section
    const priceLines: string[] = []
    if (showKorRetail && korRetail > 0)
      priceLines.push(`🇰🇷 Narx: ₩${korRetail.toLocaleString('en')} / dona`)
    if (showKorWholesale && korWholesale > 0)
      priceLines.push(`🇰🇷 Narx: ₩${korWholesale.toLocaleString('en')} dan — ${korMinQty} tadan`)
    if (showUzbRetail && uzbRetail > 0)
      priceLines.push(`🇺🇿 Narx: ${uzbRetail.toLocaleString('en')} so'm / dona`)
    if (showUzbWholesale && uzbWholesale > 0)
      priceLines.push(`🇺🇿 Narx: ${uzbWholesale.toLocaleString('en')} so'm dan — ${uzbMinQty} tadan`)

    if (priceLines.length > 0) {
      lines.push(SEP)
      lines.push('')
      lines.push(...priceLines)
      lines.push('')
      lines.push(SEP)
    }

    // Phone
    const activePhone = watchPhone?.trim()
    if (activePhone) {
      lines.push('')
      lines.push(`📞 ${activePhone}`)
    }

    // Links as HTML
    const activeLinks = [0, 1, 2]
      .filter((i) => linksEnabled[i] && linkUrls[i]?.trim() && linkLabels[i]?.trim())
      .map((i) => `<a href="${linkUrls[i]}">${linkLabels[i]}</a>`)

    if (activeLinks.length > 0) {
      lines.push('')
      lines.push(activeLinks.join('  |  '))
    }

    return lines.join('\n')
  }

  const previewCaption = buildCaption()
  const connectedCount = channels.filter((c: any) => c.isActive).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Telegram</h1>
          <p className="text-sm text-muted-foreground">{connectedCount} ta kanal ulangan</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setAddChannelSheet(true)}
          className="rounded-lg gap-1.5 h-8 border-[0.5px] text-xs"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          Kanal qo'shish
        </Button>
      </div>

      {channels.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none py-1">
          {channels.map((ch: any) => (
            <div
              key={ch.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border-[0.5px] border-border shrink-0"
            >
              <div
                className={cn('w-2 h-2 rounded-full', ch.isActive ? 'bg-green-500' : 'bg-gray-300')}
              />
              <span className="text-xs font-medium text-gray-900">
                {ch.channelName ?? ch.channelUsername}
              </span>
              <button
                onClick={() => removeChannelMutation.mutate(ch.id)}
                className="w-4 h-4 text-gray-400 hover:text-red-500 ml-1 transition-colors"
              >
                <X className="h-3 w-3" strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* LEFT: Create post form */}
        <div className="lg:col-span-3 bg-white rounded-xl border-[0.5px] border-border p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Yangi post</h2>
          <form
            onSubmit={handleSubmit((data) => {
              if (createMutation.isPending) return
              setIsSubmitted(true)
              createMutation.mutate(data)
            })}
            className="space-y-4"
          >
            <div>
              <Label className="text-xs mb-1.5 block">Mahsulot *</Label>
              <div className="relative product-search-container">
                <Input
                  value={productSearch}
                  onChange={(e) => {
                    const val = e.target.value
                    setProductSearch(val)
                    if (!val.trim()) {
                      setSelectedProduct(null)
                      setValue('productId', '')
                      setProductResults([])
                    }
                  }}
                  placeholder="Mahsulot nomini yozing..."
                  className={cn('h-9 text-sm rounded-lg border-[0.5px]', selectedProduct && 'pr-8')}
                  autoComplete="off"
                />

                {/* Dropdown results */}
                {productResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border-[0.5px] border-border shadow-xl z-[200] max-h-64 overflow-y-auto">
                    {productResults.map((p: any) => (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setSelectedProduct(p)
                          setProductSearch(p.name ?? p.nameKo ?? '')
                          setProductResults([])
                          setValue('productId', p.id, { shouldValidate: true })
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-primary/5 transition-colors text-left border-b border-border/20 last:border-0"
                      >
                        {p.imageUrls?.[0] ? (
                          <img
                            src={p.imageUrls[0]}
                            className="w-10 h-10 min-w-[2.5rem] shrink-0 rounded-lg object-cover border-[0.5px] border-border"
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 min-w-[2.5rem] shrink-0 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Package className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {p.name ?? p.nameKo}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {p.brandName ?? p.brand} {p.barcode ? ` · ${p.barcode}` : ''}
                          </p>
                        </div>
                        {(p.retailPrice ?? p.korRegionalConfig?.retailPrice) ? (
                          <p className="text-xs font-semibold text-gray-900 shrink-0">
                            {formatKRW(p.retailPrice ?? p.korRegionalConfig?.retailPrice)}
                          </p>
                        ) : null}
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected product indicator */}
                {selectedProduct && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white pl-2">
                    <Check className="h-4 w-4 text-green-600" strokeWidth={2} />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProduct(null)
                        setProductSearch('')
                        setValue('productId', '')
                        setProductResults([])
                      }}
                      className="text-muted-foreground hover:text-gray-700"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {errors.productId && isSubmitted && (
                <p className="text-xs text-red-500 mt-1">Mahsulot tanlang</p>
              )}
            </div>

            {/* Price toggles section */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Narxlarni ko'rsatish
              </p>

              {/* KOR section */}
              <div className="p-3 rounded-lg bg-gray-50 border-[0.5px] border-border/50">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-3">
                  🇰🇷 Koreya (KRW)
                </p>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-900">Dona narxi</p>
                      <p className="text-[11px] text-muted-foreground">
                        {korRetail > 0 ? `₩${korRetail.toLocaleString()} / dona` : 'Kiritilmagan'}
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={showKorRetail}
                      onChange={setShowKorRetail}
                      disabled={korRetail === 0}
                      size="sm"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-900">Optom narxi</p>
                      <p className="text-[11px] text-muted-foreground">
                        {korWholesale > 0
                          ? `₩${korWholesale.toLocaleString()} dan — ${korMinQty} tadan`
                          : 'Kiritilmagan'}
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={showKorWholesale}
                      onChange={setShowKorWholesale}
                      disabled={korWholesale === 0}
                      size="sm"
                    />
                  </div>
                </div>
              </div>

              {/* UZB section */}
              <div className="p-3 rounded-lg bg-gray-50 border-[0.5px] border-border/50">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-3">
                  🇺🇿 O'zbekiston (UZS)
                </p>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-900">Dona narxi</p>
                      <p className="text-[11px] text-muted-foreground">
                        {uzbRetail > 0
                          ? `${uzbRetail.toLocaleString()} so'm / dona`
                          : 'Kiritilmagan'}
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={showUzbRetail}
                      onChange={setShowUzbRetail}
                      disabled={uzbRetail === 0}
                      size="sm"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-900">Optom narxi</p>
                      <p className="text-[11px] text-muted-foreground">
                        {uzbWholesale > 0
                          ? `${uzbWholesale.toLocaleString()} so'm dan — ${uzbMinQty} tadan`
                          : 'Kiritilmagan'}
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={showUzbWholesale}
                      onChange={setShowUzbWholesale}
                      disabled={uzbWholesale === 0}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1.5 block">Kanal *</Label>
              <Controller
                name="channelId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9 text-sm rounded-lg border-[0.5px]">
                      <SelectValue placeholder="Kanal tanlang" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {channels
                        .filter((c: any) => c.isActive)
                        .map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              {c.channelName ?? c.channelUsername}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.channelId && isSubmitted && channels.length > 0 && (
                <p className="text-xs text-red-500 mt-1">{errors.channelId.message as string}</p>
              )}
              {channels.length === 0 && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Avval kanal qo'shish kerak
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs mb-1.5 block">Telefon raqami (havolali)</Label>
              <div className="relative">
                <Phone
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
                  strokeWidth={1.5}
                />
                <Input
                  {...register('phoneNumber')}
                  placeholder="+82 10-xxxx-xxxx"
                  className="h-9 text-sm rounded-lg border-[0.5px] pl-9"
                  onBlur={() => saveSettingsMutation.mutate({ phone: watchPhone })}
                />
              </div>
            </div>

            {/* Links section */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
                Pastki tugmalar (linklar)
              </Label>

              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <ToggleSwitch
                    size="sm"
                    checked={linksEnabled[i]}
                    onChange={(v) => {
                      const next = [...linksEnabled]
                      next[i] = v
                      setLinksEnabled(next)
                    }}
                  />
                  <Input
                    value={linkLabels[i]}
                    onChange={(e) => {
                      const next = [...linkLabels]
                      next[i] = e.target.value
                      setLinkLabels(next)
                    }}
                    onBlur={() => saveSettings()}
                    placeholder={['Telegram', 'Instagram', 'Website'][i]}
                    className="h-8 text-xs rounded-lg border-[0.5px] w-28 shrink-0"
                  />
                  <Input
                    value={linkUrls[i]}
                    onChange={(e) => {
                      const next = [...linkUrls]
                      next[i] = e.target.value
                      setLinkUrls(next)
                    }}
                    onBlur={() => saveSettings()}
                    placeholder="https://..."
                    className="h-8 text-xs rounded-lg border-[0.5px] flex-1"
                  />
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs">Post matni *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateCaption}
                  disabled={generatingCaption || !selectedProduct}
                  className="h-7 rounded-lg gap-1.5 border-[0.5px] text-[11px] text-violet-600 border-violet-200 hover:bg-violet-50"
                >
                  {generatingCaption ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}{' '}
                  AI yozsin
                </Button>
              </div>
              <textarea
                {...register('caption')}
                rows={6}
                placeholder="Mahsulot haqida matn yozing yoki AI yordamida yarating..."
                className="w-full rounded-lg border-[0.5px] border-border p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
              />
              {errors.caption && isSubmitted && (
                <p className="text-xs text-red-500 mt-1">{errors.caption.message as string}</p>
              )}
            </div>

            <div className="space-y-3">
              <Controller
                name="sendNow"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={createMutation.isPending}
                      onClick={() => field.onChange(true)}
                      className={cn(
                        'flex-1 flex items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium border-[0.5px] transition-all',
                        field.value
                          ? 'bg-primary/10 border-primary/40 text-primary'
                          : 'bg-white border-border text-gray-600',
                        createMutation.isPending && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Hozir yuborish
                    </button>
                    <button
                      type="button"
                      disabled={createMutation.isPending}
                      onClick={() => field.onChange(false)}
                      className={cn(
                        'flex-1 flex items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium border-[0.5px] transition-all',
                        !field.value
                          ? 'bg-primary/10 border-primary/40 text-primary'
                          : 'bg-white border-border text-gray-600',
                        createMutation.isPending && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Rejalashtirish
                    </button>
                  </div>
                )}
              />
              {!watchSendNow && (
                <div>
                  <Label className="text-xs mb-1.5 block">Yuborish vaqti</Label>
                  <Input
                    {...register('scheduledAt')}
                    type="datetime-local"
                    min={new Date().toISOString().slice(0, 16)}
                    className="h-9 text-sm rounded-lg border-[0.5px]"
                  />
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full rounded-lg gap-2 h-10"
            >
              {createMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : watchSendNow ? (
                <Send className="h-4 w-4" strokeWidth={1.5} />
              ) : (
                <Clock className="h-4 w-4" strokeWidth={1.5} />
              )}
              {createMutation.isPending
                ? 'Yuklanmoqda...'
                : watchSendNow
                  ? 'Post yuborish'
                  : 'Rejalashtirish'}
            </Button>
          </form>
        </div>

        {/* RIGHT: Preview + History */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white rounded-xl border-[0.5px] border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50 bg-gray-50/50 flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Ko'rinishi
              </p>
            </div>
            <div className="p-4 bg-[#6A91C2]">
              {!selectedProduct && !watchCaption ? (
                <div className="text-center py-8 bg-white/10 rounded-2xl border border-white/20">
                  <Radio className="h-8 w-8 text-white/50 mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-xs text-white/70">Mahsulot tanlang yoki matn yozing</p>
                </div>
              ) : (
                <div className="bg-[#EFFDDE] rounded-2xl rounded-tr-sm p-3 max-w-[280px] ml-auto shadow-sm">
                  {selectedProduct?.imageUrls?.[0] && (
                    <img
                      src={selectedProduct.imageUrls[0]}
                      alt="product"
                      className="w-full rounded-xl object-cover mb-2 max-h-48"
                    />
                  )}
                  <div
                    className="text-[12px] leading-relaxed text-gray-900 whitespace-pre-wrap font-sans [&_a]:text-blue-500 [&_a]:underline"
                    dangerouslySetInnerHTML={{
                      __html: previewCaption
                        ? previewCaption.replace(/\n/g, '<br/>')
                        : '<span class="text-muted-foreground text-xs italic">Mahsulot tanlang yoki matn yozing</span>',
                    }}
                  />

                  <p className="text-[10px] text-gray-400 text-right mt-1.5">
                    {new Date().toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })} ✓✓
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border-[0.5px] border-border overflow-hidden flex-1">
            <div className="px-4 py-3 border-b border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <History className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Tarix
                </p>
              </div>
              <div className="flex gap-1">
                {['all', 'SCHEDULED', 'SENT', 'FAILED'].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setHistoryTab(s as any)
                      setPage(1)
                    }}
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-medium transition-all',
                      historyTab === s ? 'bg-primary text-white' : 'text-muted-foreground'
                    )}
                  >
                    {s === 'all'
                      ? 'Barchasi'
                      : s === 'SCHEDULED'
                        ? 'Rejalashtirilgan'
                        : s === 'SENT'
                          ? 'Yuborildi'
                          : 'Xato'}
                  </button>
                ))}
              </div>
            </div>
            <div className="divide-y divide-border/30 max-h-80 overflow-y-auto">
              {postsLoading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-xs text-muted-foreground">Postlar yo'q</p>
                </div>
              ) : (
                posts.map((post: any) => {
                  const statusInfo = POST_STATUS_LABELS[post.status] ?? POST_STATUS_LABELS.DRAFT
                  return (
                    <div
                      key={post.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                        {post.imageUrl ? (
                          <img src={post.imageUrl} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {post.title ?? 'Post'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={cn(
                              'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                              statusInfo.color
                            )}
                          >
                            {statusInfo.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {post.status === 'SCHEDULED'
                              ? formatDateTime(post.scheduledAt)
                              : formatRelative(post.sentAt ?? post.createdAt)}
                          </span>
                        </div>
                      </div>
                      {post.status !== 'DELETED' && (
                        <button
                          onClick={() => setDeleteTarget(post)}
                          className="w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 text-red-500 transition-all shrink-0"
                        >
                          <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
            {meta && meta.total > LIMIT && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-border/50">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="text-xs text-primary disabled:text-gray-300 disabled:cursor-not-allowed"
                >
                  ← Oldingi
                </button>
                <span className="text-[11px] text-muted-foreground">
                  {page} / {Math.ceil(meta.total / LIMIT)}
                </span>
                <button
                  disabled={!meta.hasNext}
                  onClick={() => setPage((p) => p + 1)}
                  className="text-xs text-primary disabled:text-gray-300 disabled:cursor-not-allowed"
                >
                  Keyingi →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              {deleteTarget.status === 'SCHEDULED'
                ? 'Rejalashtirilgan postni bekor qilish'
                : "Postni o'chirish"}
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              {deleteTarget.status === 'SENT'
                ? "Telegram kanaldan ham o'chiriladi."
                : 'BullMQ rejasi ham bekor qilinadi.'}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-lg border-[0.5px]"
              >
                Bekor
              </Button>
              <Button
                size="sm"
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-lg bg-red-600 hover:bg-red-700"
              >
                {deleteMutation.isPending ? 'Yuklanmoqda...' : "O'chirish"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Sheet open={addChannelSheet} onOpenChange={setAddChannelSheet}>
        <SheetContent side="right" className="w-[90vw] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle>Kanal qo'shish</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-blue-50 rounded-lg border-[0.5px] border-blue-100">
              <p className="text-xs text-blue-700">
                ℹ️ Botni (@mira_cosmetics_bot) kanalga admin sifatida qo'shing, keyin kanal ID sini
                kiriting.
              </p>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Kanal ID yoki username *</Label>
              <Input
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="@mira_channel yoki -1001234567890"
                className="h-9 text-sm rounded-lg border-[0.5px]"
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Kanal nomi *</Label>
              <Input
                value={chatName}
                onChange={(e) => setChatName(e.target.value)}
                placeholder="Mira Cosmetics Official"
                className="h-9 text-sm rounded-lg border-[0.5px]"
              />
            </div>
            <Button
              className="w-full rounded-lg"
              disabled={addChannelMutation.isPending}
              onClick={() => addChannelMutation.mutate()}
            >
              {addChannelMutation.isPending ? 'Yuklanmoqda...' : "Qo'shish"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
