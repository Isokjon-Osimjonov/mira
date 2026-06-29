import { useState } from 'react'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'
import { analyticsApi } from '../../api/analytics.api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function HisobotlarPage() {
  const [exporting, setExporting] = useState<string | null>(null)
  const now = new Date()

  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)

  const MONTHS = [
    'Yanvar',
    'Fevral',
    'Mart',
    'Aprel',
    'May',
    'Iyun',
    'Iyul',
    'Avgust',
    'Sentabr',
    'Oktabr',
    'Noyabr',
    'Dekabr',
  ]

  const handleExport = async (type: string, format: 'csv' | 'excel') => {
    setExporting(type)
    try {
      const from = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
      const to = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0]

      // Format is just for UI here, backend currently only does CSV
      // If backend supports excel later, we can pass format parameter
      await analyticsApi.exportCSV({
        type: type as any,
        from,
        to,
      })
      toast.success('Fayl yuklab olindi')
    } catch {
      toast.error('Export xatolik')
    } finally {
      setExporting(null)
    }
  }

  const REPORTS = [
    {
      id: 'revenue',
      icon: '📊',
      title: 'Daromad hisoboti',
      desc: "Oy bo'yicha daromad, KOR va UZB breakdown",
      color: 'border-blue-100 bg-blue-50/30',
    },
    {
      id: 'pl',
      icon: '💰',
      title: 'P&L hisoboti',
      desc: 'Daromad, Tannarx, Xarajatlar, Sof foyda',
      color: 'border-green-100 bg-green-50/30',
    },
    {
      id: 'orders',
      icon: '📦',
      title: 'Buyurtmalar hisoboti',
      desc: 'Barcha buyurtmalar, holat, summalar',
      color: 'border-purple-100 bg-purple-50/30',
    },
    {
      id: 'inventory',
      icon: '🏪',
      title: 'Inventar hisoboti',
      desc: 'Joriy stok holati, tannarx, partiyalar',
      color: 'border-amber-100 bg-amber-50/30',
    },
    {
      id: 'customers',
      icon: '👥',
      title: 'Mijozlar hisoboti',
      desc: "Mijozlar ro'yxati, xarid tarixi, LTV",
      color: 'border-pink-100 bg-pink-50/30',
    },
    {
      id: 'expenses',
      icon: '💸',
      title: 'Xarajatlar hisoboti',
      desc: "Xarajatlar kategoriyalar bo'yicha",
      color: 'border-red-100 bg-red-50/30',
    },
  ]

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Hisobotlar</h1>
        <p className="text-sm text-muted-foreground">Excel va CSV formatida yuklab olish</p>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border-[0.5px] border-border p-4">
        <p className="text-sm font-medium text-gray-900 shrink-0">Hisobot davri:</p>
        <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
          <SelectTrigger className="h-9 text-sm rounded-lg border-[0.5px] w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {MONTHS.map((m, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="h-9 text-sm rounded-lg border-[0.5px] w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {[2024, 2025, 2026].map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="text-sm text-muted-foreground">
          {MONTHS[selectedMonth - 1]} {selectedYear}
        </p>
      </div>

      {/* Report cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map((report) => (
          <div
            key={report.id}
            className={cn('rounded-xl border-[0.5px] p-5 flex flex-col gap-3', report.color)}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{report.icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{report.title}</p>
                <p className="text-[11px] text-muted-foreground">{report.desc}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={exporting === report.id}
                onClick={() => handleExport(report.id, 'csv')}
                className="flex-1 rounded-lg h-8 border-[0.5px] text-xs gap-1.5"
              >
                {exporting === report.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : '📄'}
                CSV
              </Button>
              <Button
                size="sm"
                disabled={exporting === report.id}
                onClick={() => handleExport(report.id, 'excel')}
                className="flex-1 rounded-lg h-8 text-xs gap-1.5"
              >
                {exporting === report.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : '📊'}
                Excel
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Info note */}
      <div className="bg-blue-50 rounded-xl border-[0.5px] border-blue-100 p-4">
        <p className="text-xs text-blue-700">
          ℹ️ Hisobotlar tanlangan davr uchun avtomatik shakllantiriladi. Excel formatida hisobchi
          uchun tayyor ko'rinishda yuklab olasiz.
        </p>
      </div>
    </div>
  )
}
