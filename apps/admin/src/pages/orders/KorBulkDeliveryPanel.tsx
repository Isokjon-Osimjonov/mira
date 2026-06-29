import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '../../lib/api'
import { ordersApi } from '../../api/orders.api'
import { queryClient } from '../../lib/query-client'
import { addBusinessDays } from '../../../../../libs/shared-utils/src/date'
import { getErrorMessage } from '../../lib/errors'

export function KorBulkDeliveryPanel() {
  const [shipDate, setShipDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [deliveryDate, setDeliveryDate] = useState(format(addBusinessDays(new Date(), 1), 'yyyy-MM-dd'))
  const [hasSearched, setHasSearched] = useState(false)

  // Fetch SHIPPED orders in KOR that were shipped on shipDate
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders-kor-bulk', shipDate],
    queryFn: () =>
      ordersApi.list({
        status: 'SHIPPED',
        region: 'KOR',
        shippedDate: shipDate,
        limit: 1000,
      }),
    enabled: hasSearched,
  })

  const orders = data?.data || []
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const handleSearch = () => {
    setHasSearched(true)
    refetch().then((res) => {
      const allIds = res.data?.data?.map((o) => o.id) || []
      setSelectedIds(new Set(allIds))
    })
  }

  const handleShipDateChange = (date: string) => {
    setShipDate(date)
    setDeliveryDate(format(addBusinessDays(new Date(date), 1), 'yyyy-MM-dd'))
    setHasSearched(false)
  }

  const bulkStatusMutation = useMutation({
    mutationFn: (payload: { ids: string[]; status: string; payloadOverrides: any }) =>
      api.post('/admin/orders/bulk-status', payload).then((r) => r.data),
    onSuccess: (res, vars) => {
      queryClient.removeQueries()
      if (res.failed && res.failed.length > 0) {
        toast.warning(`${res.succeeded.length} ta yangilandi, ${res.failed.length} ta o'tkazib yuborildi`)
      } else {
        toast.success(`${vars.ids.length} ta buyurtma Yetkazildi deb belgilandi!`)
      }
      setHasSearched(false)
      setSelectedIds(new Set())
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkDeliver = () => {
    if (selectedIds.size === 0) return
    bulkStatusMutation.mutate({
      ids: Array.from(selectedIds),
      status: 'DELIVERED',
      payloadOverrides: {
        deliveredAt: new Date(deliveryDate).toISOString(),
      },
    })
  }

  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm mt-4">
      <h3 className="text-sm font-semibold mb-4">KOR Yetkazib berishni belgilash</h3>
      
      <div className="flex items-end gap-4 mb-6">
        <div>
          <label className="block text-[11px] font-medium text-muted-foreground uppercase mb-1.5">
            Jo'natilgan sana
          </label>
          <Input
            type="date"
            className="w-40 text-sm h-9"
            value={shipDate}
            onChange={(e) => handleShipDateChange(e.target.value)}
          />
        </div>
        
        <div>
          <label className="block text-[11px] font-medium text-muted-foreground uppercase mb-1.5">
            Yetkazilgan sana
          </label>
          <Input
            type="date"
            className="w-40 text-sm h-9"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
          />
        </div>

        <Button onClick={handleSearch} disabled={isLoading} className="h-9">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Qidirish'}
        </Button>
      </div>

      {hasSearched && (
        <div className="border rounded-lg overflow-hidden bg-gray-50/50">
          <div className="max-h-60 overflow-y-auto p-2">
            {orders.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-4">Bu sanada jo'natilgan KOR buyurtmalari topilmadi</p>
            ) : (
              <div className="space-y-1">
                {orders.map((o) => (
                  <label key={o.id} className="flex items-center justify-between p-2 hover:bg-white rounded border border-transparent hover:border-border cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(o.id)}
                        onChange={() => toggleSelect(o.id)}
                        className="rounded cursor-pointer"
                      />
                      <span className="text-sm font-medium">{o.orderNumber}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{o.customerName}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          
          {orders.length > 0 && (
            <div className="p-3 border-t bg-white flex justify-between items-center">
              <span className="text-sm font-medium">{selectedIds.size} / {orders.length} tanlandi</span>
              <Button
                onClick={handleBulkDeliver}
                disabled={selectedIds.size === 0 || bulkStatusMutation.isPending}
                size="sm"
              >
                {bulkStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {selectedIds.size} ta buyurtmani 'Yetkazildi' deb belgilash
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
