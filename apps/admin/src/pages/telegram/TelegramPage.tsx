import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Send, Clock, Trash2, RefreshCw,
  Sparkles, Eye, History, Radio,
  Phone, Check, Image as ImageIcon,
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
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select'

const POST_STATUS_LABELS: Record<string, any> = {
  SENT:      { label: 'Yuborildi',    color: 'text-green-600 bg-green-50' },
  SCHEDULED: { label: 'Rejalashtirilgan', color: 'text-blue-600 bg-blue-50' },
  FAILED:    { label: 'Xato',         color: 'text-red-600 bg-red-50' },
  DELETED:   { label: 'O\'chirildi',  color: 'text-gray-500 bg-gray-100' },
  DRAFT:     { label: 'Qoralama',     color: 'text-amber-600 bg-amber-50' },
}

const postSchema = z.object({
  productId:    z.string().min(1, 'Mahsulot tanlang'),
  channelId:    z.string().min(1, 'Kanal tanlang'),
  caption:      z.string().min(1, 'Matn kiriting'),
  showRetail:   z.boolean().default(true),
  showWholesale: z.boolean().default(false),
  phone:        z.string().optional(),
  sendNow:      z.boolean().default(true),
  scheduledAt:  z.string().optional(),
})
type PostForm = z.infer<typeof postSchema>

export function TelegramPage() {
  const qc        = useQueryClient()
  const { rate }  = useExchangeRate()

  const [historyTab, setHistoryTab] = useState<'all'|'SCHEDULED'|'SENT'|'FAILED'>('all')
  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState<any[]>([])
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [generatingCaption, setGeneratingCaption] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [page, setPage] = useState(1)
  const LIMIT = 10

  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm<any>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      showRetail: true,
      showWholesale: false,
      sendNow: true,
    }
  })

  const watchCaption      = watch('caption')
  const watchShowRetail   = watch('showRetail')
  const watchShowWholesale = watch('showWholesale')
  const watchPhone        = watch('phone')
  const watchSendNow      = watch('sendNow')

  // Channels
  const { data: channels = [] } = useQuery({
    queryKey: QK.TELEGRAM_CHANNELS,
    queryFn:  telegramApi.getChannels,
    staleTime: 300_000,
  })

  // Posts history
  const { data: postsRes, isLoading: postsLoading } = useQuery({
    queryKey: QK.TELEGRAM_POSTS({
      status: historyTab === 'all' ? undefined : historyTab,
      page, limit: LIMIT,
    }),
    queryFn: () => telegramApi.getPosts({
      status: historyTab === 'all' ? undefined : historyTab,
      page, limit: LIMIT,
    }),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
  const posts = postsRes?.data ?? []
  const meta = postsRes?.meta

  // Product search
  useEffect(() => {
    if (!productSearch || (selectedProduct && productSearch === selectedProduct.name)) {
      setProductResults([])
      return
    }
    const t = setTimeout(async () => {
      try {
        const res = await productsApi.list({ q: productSearch, limit: 5 })
        setProductResults(res.data?.data ?? [])
      } catch {}
    }, 300)
    return () => clearTimeout(t)
  }, [productSearch, selectedProduct])

  const handleSelectProduct = (product: any) => {
    setSelectedProduct(product)
    setProductSearch(product.name)
    setProductResults([])
    setValue('productId', product.id)
  }

  const handleGenerateCaption = async () => {
    if (!selectedProduct) {
      toast.error('Avval mahsulot tanlang')
      return
    }
    setGeneratingCaption(true)
    try {
      const res = await telegramApi.generateCaption({
        productId:    selectedProduct.id,
        showRetail:   watchShowRetail,
        showWholesale: watchShowWholesale,
        phone:        watchPhone,
        language:     'uz',
      })
      setValue('caption', res.caption)
      toast.success('AI matn yaratdi ✨')
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
        content: data.caption,
        imageUrl: imageUrls[0] || null,
        scheduledAt: data.sendNow ? null : (data.scheduledAt ? new Date(data.scheduledAt).toISOString() : null),
      })
    },
    onSuccess: () => {
      toast.success(watchSendNow ? 'Post yuborildi! 🚀' : 'Post rejalashtirildi ✅')
      qc.invalidateQueries({ queryKey: ['telegram', 'posts'] })
      reset({ showRetail: true, showWholesale: false, sendNow: true, caption: '' })
      setSelectedProduct(null)
      setProductSearch('')
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? ''))
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => telegramApi.deletePost(id),
    onSuccess: () => {
      toast.success('Post o\'chirildi')
      qc.invalidateQueries({ queryKey: ['telegram', 'posts'] })
      setDeleteTarget(null)
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? ''))
  })

  const buildPreviewCaption = () => {
    if (!selectedProduct && !watchCaption) return null
    const lines: string[] = []
    if (watchCaption) {
      lines.push(watchCaption)
    } else if (selectedProduct) {
      lines.push(`🌸 *${selectedProduct.name}*`)
    }
    const retailPrice = selectedProduct?.korRegionalConfig?.retailPriceKrw ?? selectedProduct?.retailPriceKrw
    const wholesalePrice = selectedProduct?.korRegionalConfig?.wholesalePriceKrw ?? selectedProduct?.wholesalePriceKrw
    if (watchShowRetail && retailPrice) {
      lines.push(``)
      lines.push(`💰 Narx: ${formatKRW(retailPrice)}`)
      if (rate) lines.push(`    ≈ ${formatUZS(Math.round(retailPrice * rate))}`)
    }
    if (watchShowWholesale && wholesalePrice) {
      lines.push(`🏷 Ulguji: ${formatKRW(wholesalePrice)}`)
    }
    if (watchPhone) {
      lines.push(``)
      lines.push(`📞 ${watchPhone}`)
    }
    return lines.join('\n')
  }

  const previewCaption = buildPreviewCaption()
  const connectedCount = channels.filter((c: any) => c.isActive).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Telegram</h1>
          <p className="text-sm text-muted-foreground">{connectedCount} ta kanal ulangan</p>
        </div>
      </div>

      {channels.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {channels.map((ch: any) => (
            <div key={ch.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border-[0.5px] border-border shrink-0">
              <div className={cn('w-2 h-2 rounded-full', ch.isActive ? 'bg-green-500' : 'bg-gray-300')} />
              <span className="text-xs font-medium text-gray-900">{ch.channelName ?? ch.channelUsername}</span>
              {ch.postCount !== undefined && (
                <span className="text-[10px] text-muted-foreground">{ch.postCount} post</span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* LEFT: Create post form */}
        <div className="lg:col-span-3 bg-white rounded-xl border-[0.5px] border-border p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Yangi post</h2>
          <form onSubmit={handleSubmit(data => createMutation.mutate(data))} className="space-y-4">
            <div>
              <Label className="text-xs mb-1.5 block">Mahsulot *</Label>
              <div className="relative">
                <Input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Mahsulot nomi yoki barcode..." className="h-9 text-sm rounded-lg border-[0.5px]" />
                {selectedProduct && <div className="absolute right-2 top-1/2 -translate-y-1/2"><Check className="h-4 w-4 text-green-600" /></div>}
                {productResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border-[0.5px] border-border shadow-lg z-20 overflow-hidden">
                    {productResults.map((p: any) => (
                      <button key={p.id} type="button" onClick={() => handleSelectProduct(p)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left">
                        {p.imageUrls?.[0] ? <img src={p.imageUrls[0]} className="w-8 h-8 rounded-lg object-cover shrink-0 border-[0.5px] border-border" />
                        : <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center"><ImageIcon className="h-4 w-4 text-gray-400" strokeWidth={1.5} /></div>}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground">{p.brandName}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {errors.productId && <p className="text-xs text-red-500 mt-1">{errors.productId.message as string}</p>}
            </div>

            <div>
              <Label className="text-xs mb-1.5 block">Kanal *</Label>
              <Controller name="channelId" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-9 text-sm rounded-lg border-[0.5px]"><SelectValue placeholder="Kanal tanlang" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {channels.filter((c: any) => c.isActive).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}><div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500" />{c.channelName ?? c.channelUsername}</div></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
              {errors.channelId && <p className="text-xs text-red-500 mt-1">{errors.channelId.message as string}</p>}
            </div>

            <div>
              <Label className="text-xs mb-2 block">Narxlarni ko'rsatish</Label>
              <div className="flex gap-2">
                <Controller name="showRetail" control={control} render={({ field }) => (
                  <button type="button" onClick={() => field.onChange(!field.value)} className={cn('flex-1 py-2 rounded-lg text-xs font-medium border-[0.5px] transition-all', field.value ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-white border-border text-gray-600')}>💰 Retail narx</button>
                )} />
                <Controller name="showWholesale" control={control} render={({ field }) => (
                  <button type="button" onClick={() => field.onChange(!field.value)} className={cn('flex-1 py-2 rounded-lg text-xs font-medium border-[0.5px] transition-all', field.value ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-white border-border text-gray-600')}>🏷 Ulguji narx</button>
                )} />
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1.5 block">Telefon raqami (havolali)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                <Input {...register('phone')} placeholder="+82 10-xxxx-xxxx" className="h-9 text-sm rounded-lg border-[0.5px] pl-9" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs">Post matni *</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleGenerateCaption} disabled={generatingCaption || !selectedProduct} className="h-7 rounded-lg gap-1.5 border-[0.5px] text-[11px] text-violet-600 border-violet-200 hover:bg-violet-50">
                  {generatingCaption ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} AI yozsin
                </Button>
              </div>
              <textarea {...register('caption')} rows={6} placeholder="Mahsulot haqida matn yozing yoki AI yordamida yarating..." className="w-full rounded-lg border-[0.5px] border-border p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono" />
              {errors.caption && <p className="text-xs text-red-500 mt-1">{errors.caption.message as string}</p>}
            </div>

            <div className="space-y-3">
              <Controller name="sendNow" control={control} render={({ field }) => (
                <div className="flex gap-2">
                  <button type="button" onClick={() => field.onChange(true)} className={cn('flex-1 flex items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium border-[0.5px] transition-all', field.value ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-white border-border text-gray-600')}><Send className="h-3.5 w-3.5" strokeWidth={1.5} />Hozir yuborish</button>
                  <button type="button" onClick={() => field.onChange(false)} className={cn('flex-1 flex items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium border-[0.5px] transition-all', !field.value ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-white border-border text-gray-600')}><Clock className="h-3.5 w-3.5" strokeWidth={1.5} />Rejalashtirish</button>
                </div>
              )} />
              {!watchSendNow && (
                <div>
                  <Label className="text-xs mb-1.5 block">Yuborish vaqti</Label>
                  <Input {...register('scheduledAt')} type="datetime-local" min={new Date().toISOString().slice(0, 16)} className="h-9 text-sm rounded-lg border-[0.5px]" />
                </div>
              )}
            </div>

            <Button type="submit" disabled={createMutation.isPending} className="w-full rounded-lg gap-2 h-10">
              {createMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : watchSendNow ? <Send className="h-4 w-4" strokeWidth={1.5} /> : <Clock className="h-4 w-4" strokeWidth={1.5} />}
              {createMutation.isPending ? 'Yuklanmoqda...' : watchSendNow ? 'Post yuborish' : 'Rejalashtirish'}
            </Button>
          </form>
        </div>

        {/* RIGHT: Preview + History */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white rounded-xl border-[0.5px] border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50 bg-gray-50/50 flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ko'rinishi</p>
            </div>
            <div className="p-4 bg-[#6A91C2]">
              {!selectedProduct && !watchCaption ? (
                <div className="text-center py-8 bg-white/10 rounded-2xl border border-white/20">
                  <Radio className="h-8 w-8 text-white/50 mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-xs text-white/70">Mahsulot tanlang yoki matn yozing</p>
                </div>
              ) : (
                <div className="bg-[#EFFDDE] rounded-2xl rounded-tr-sm p-3 max-w-[280px] ml-auto shadow-sm">
                  {selectedProduct?.imageUrls?.[0] && <img src={selectedProduct.imageUrls[0]} alt="product" className="w-full rounded-xl object-cover mb-2 max-h-48" />}
                  <div className="text-[13px] text-gray-900 leading-relaxed whitespace-pre-line">
                    {previewCaption ? previewCaption.split('\n').map((line, i) => (
                      <p key={i}>{line.includes('+') && line.includes('📞') ? <span>📞 <span className="text-blue-500 underline">{line.replace('📞 ', '')}</span></span>
                      : line.startsWith('*') && line.endsWith('*') ? <strong>{line.replace(/\*/g, '')}</strong> : line}</p>
                    )) : <span className="text-muted-foreground text-xs italic">Matn yo'q</span>}
                  </div>
                  <p className="text-[10px] text-gray-400 text-right mt-1.5">{new Date().toLocaleTimeString('uz',{hour:'2-digit', minute:'2-digit'})} ✓✓</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border-[0.5px] border-border overflow-hidden flex-1">
            <div className="px-4 py-3 border-b border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <History className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tarix</p>
              </div>
              <div className="flex gap-1">
                {['all','SCHEDULED','SENT','FAILED'].map(s => (
                  <button key={s} onClick={() => { setHistoryTab(s as any); setPage(1) }} className={cn('px-2 py-0.5 rounded text-[10px] font-medium transition-all', historyTab === s ? 'bg-primary text-white' : 'text-muted-foreground')}>
                    {s === 'all' ? 'Barchasi' : s === 'SCHEDULED' ? 'Rejalashtirilgan' : s === 'SENT' ? 'Yuborildi' : 'Xato'}
                  </button>
                ))}
              </div>
            </div>
            <div className="divide-y divide-border/30 max-h-80 overflow-y-auto">
              {postsLoading ? <div className="p-4 space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}</div>
              : posts.length === 0 ? <div className="p-6 text-center"><p className="text-xs text-muted-foreground">Postlar yo'q</p></div>
              : posts.map((post: any) => {
                const statusInfo = POST_STATUS_LABELS[post.status] ?? POST_STATUS_LABELS.DRAFT
                return (
                  <div key={post.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors group">
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                      {post.imageUrl ? <img src={post.imageUrl} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-4 w-4 text-gray-400" strokeWidth={1.5} /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{post.title ?? 'Post'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', statusInfo.color)}>{statusInfo.label}</span>
                        <span className="text-[10px] text-muted-foreground">{post.status === 'SCHEDULED' ? formatDateTime(post.scheduledAt) : formatRelative(post.sentAt ?? post.createdAt)}</span>
                      </div>
                    </div>
                    {post.status !== 'DELETED' && (
                      <button onClick={() => setDeleteTarget(post)} className="w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 text-red-500 transition-all shrink-0">
                        <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            {meta && meta.total > LIMIT && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-border/50">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="text-xs text-primary disabled:text-gray-300 disabled:cursor-not-allowed">← Oldingi</button>
                <span className="text-[11px] text-muted-foreground">{page} / {Math.ceil(meta.total / LIMIT)}</span>
                <button disabled={!meta.hasNext} onClick={() => setPage(p => p + 1)} className="text-xs text-primary disabled:text-gray-300 disabled:cursor-not-allowed">Keyingi →</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 mb-2">{deleteTarget.status === 'SCHEDULED' ? 'Rejalashtirilgan postni bekor qilish' : 'Postni o\'chirish'}</h3>
            <p className="text-sm text-muted-foreground mb-5">{deleteTarget.status === 'SENT' ? 'Telegram kanaldan ham o\'chiriladi.' : 'BullMQ rejasi ham bekor qilinadi.'}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} className="flex-1 rounded-lg border-[0.5px]">Bekor</Button>
              <Button size="sm" onClick={() => deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending} className="flex-1 rounded-lg bg-red-600 hover:bg-red-700">{deleteMutation.isPending ? 'Yuklanmoqda...' : 'O\'chirish'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
