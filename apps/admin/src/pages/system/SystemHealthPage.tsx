import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Database,
  Bot,
  Server,
  Activity,
  Clock,
  Zap,
} from 'lucide-react'
import { api } from '../../lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function SystemHealthPage() {
  const qc = useQueryClient()

  const {
    data: healthRes,
    isLoading: healthLoading,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const res = await api.get('/health')
      return res.data.data
    },
    refetchInterval: 60_000,
  })

  const { data: queueStats = [], isLoading: queuesLoading } = useQuery({
    queryKey: ['queue-stats'],
    queryFn: async () => {
      const res = await api.get('/admin/queues/stats')
      return res.data.data ?? []
    },
    refetchInterval: 60_000,
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['system-health'] })
    qc.invalidateQueries({ queryKey: ['queue-stats'] })
  }

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'ok' || status === 'Ulangan' || status === 'Ishlayapti' || status === 'Faol') {
      return <CheckCircle className="h-4 w-4 text-green-500" strokeWidth={1.5} />
    }
    if (status === 'warning') {
      return <AlertCircle className="h-4 w-4 text-amber-500" strokeWidth={1.5} />
    }
    return <XCircle className="h-4 w-4 text-red-500" strokeWidth={1.5} />
  }

  const QUEUE_LABELS: Record<string, string> = {
    'telegram-posts': '📱 Telegram postlar',
    notifications: '📦 Bildirishnomalar',
    'payment-deadline': "⏰ To'lov muddatlari",
    'sales-rollup': '📊 Savdo hisoboti',
    'db-backup': '💾 DB zaxira nusxasi',
    'exchange-rate': '💱 Valyuta kursi',
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Tizim holati</h1>
          {healthRes && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Uptime: {Math.floor((healthRes.uptime ?? 0) / 60)} daqiqa
              </span>
              <span>·</span>
              <span>v{healthRes.version ?? '0.3.0'}</span>
              <span>·</span>
              <span className="capitalize">{healthRes.env ?? 'development'}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            {dataUpdatedAt ? `Oxirgi: ${new Date(dataUpdatedAt).toLocaleTimeString('uz')}` : ''}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={refresh}
            className="rounded-lg gap-1.5 h-8 border-[0.5px] text-xs"
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5', (healthLoading || queuesLoading) && 'animate-spin')}
              strokeWidth={1.5}
            />
            Yangilash
          </Button>
        </div>
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: Services */}
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Xizmatlar
          </h2>

          {[
            {
              name: 'API Server',
              icon: Server,
              color: 'text-blue-600 bg-blue-50',
              status: healthRes?.status === 'ok' ? 'Ishlayapti' : 'Xato',
              details: [
                { label: 'Status', value: healthRes?.status === 'ok' ? 'Ishlayapti' : 'Xato' },
                { label: 'Uptime', value: `${Math.floor((healthRes?.uptime ?? 0) / 60)} daqiqa` },
              ],
            },
            {
              name: 'PostgreSQL',
              icon: Database,
              color: 'text-green-600 bg-green-50',
              status: healthRes?.services?.database?.status === 'ok' ? 'Ulangan' : 'Xato',
              details: [
                {
                  label: 'Status',
                  value: healthRes?.services?.database?.status === 'ok' ? 'Ulangan' : 'Xato',
                },
                {
                  label: 'Hovuz (Pool)',
                  value: String(healthRes?.services?.database?.poolSize ?? 0),
                },
                {
                  label: 'Kutayotgan',
                  value: String(healthRes?.services?.database?.waitingCount ?? 0),
                },
              ],
            },
            {
              name: 'Redis',
              icon: Zap,
              color: 'text-red-600 bg-red-50',
              status: healthRes?.services?.redis?.status?.includes('ok') ? 'Ulangan' : 'Xato',
              details: [
                {
                  label: 'Status',
                  value: healthRes?.services?.redis?.status?.includes('ok') ? 'Ulangan' : 'Xato',
                },
                {
                  label: 'Javob vaqti',
                  value: healthRes?.services?.redis?.status?.includes('ms')
                    ? (healthRes.services.redis.status.match(/\((.*?)\)/)?.[1] ?? '—')
                    : '—',
                },
              ],
            },
            {
              name: 'Telegram Bot',
              icon: Bot,
              color: 'text-purple-600 bg-purple-50',
              status: healthRes?.services?.bot?.status === 'ok' ? 'Faol' : 'Xato',
              details: [
                {
                  label: 'Status',
                  value: healthRes?.services?.bot?.status === 'ok' ? 'Faol' : 'Xato',
                },
                {
                  label: 'Username',
                  value: healthRes?.services?.bot?.username
                    ? `@${healthRes.services.bot.username}`
                    : '—',
                },
              ],
            },
          ].map((service) => (
            <div
              key={service.name}
              className="bg-white rounded-xl border-[0.5px] border-border p-3.5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center',
                      service.color
                    )}
                  >
                    <service.icon className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{service.name}</p>
                </div>
                <StatusIcon status={service.status} />
              </div>
              <div className="flex flex-col gap-1 mt-2">
                {service.details.map((d) => (
                  <div key={d.label} className="flex  items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground shrink-0">{d.label}:</span>
                    <span className="font-semibold text-gray-900">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT: Queue Stats */}
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            BullMQ Navbatlar
          </h2>

          {queuesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-white rounded-xl border-[0.5px] border-border animate-pulse"
                />
              ))}
            </div>
          ) : queueStats.length === 0 ? (
            <div className="bg-white rounded-xl border-[0.5px] border-border p-6 text-center">
              <Activity className="h-8 w-8 text-gray-300 mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">Navbat ma'lumotlari yo'q</p>
            </div>
          ) : (
            queueStats.map((q: any) => (
              <div
                key={q.name}
                className={cn(
                  'bg-white rounded-xl border-[0.5px] p-3.5',
                  q.failed > 0 ? 'border-amber-200 bg-amber-50/30' : 'border-border'
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {QUEUE_LABELS[q.name] ?? q.name}
                  </p>
                  <div className="flex items-center gap-1">
                    {q.active > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 animate-pulse">
                        Faol
                      </span>
                    )}
                    <StatusIcon status={q.status} />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[
                    {
                      label: 'Kutmoqda',
                      value: q.waiting,
                      color: q.waiting > 0 ? 'text-blue-600' : 'text-gray-500',
                    },
                    {
                      label: 'Rejalashtirilgan',
                      value: q.delayed,
                      color: q.delayed > 0 ? 'text-purple-600' : 'text-gray-500',
                    },
                    {
                      label: 'Faol',
                      value: q.active,
                      color: q.active > 0 ? 'text-green-600' : 'text-gray-500',
                    },
                    {
                      label: 'Xato',
                      value: q.failed,
                      color: q.failed > 0 ? 'text-red-600 font-bold' : 'text-gray-500',
                    },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center">
                      <p className={cn('text-lg font-bold', stat.color)}>{stat.value}</p>
                      <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          {/* Note about full board */}
          <div className="bg-gray-50 rounded-xl border-[0.5px] border-border border-dashed p-4">
            <p className="text-[11px] text-muted-foreground mb-2">
              To'liq monitoring (terminal orqali):
            </p>
            <code className="text-[10px] bg-gray-900 text-green-400 px-3 py-2 rounded-lg block font-mono overflow-x-auto whitespace-pre">
              {`ADMIN_KEY=$(grep ADMIN_QUEUE_KEY .env | cut -d= -f2)
curl -H "x-admin-key: $ADMIN_KEY" ${import.meta.env.VITE_API_URL?.replace('/api/v1', '') ?? ''}/admin/queues`}
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}
