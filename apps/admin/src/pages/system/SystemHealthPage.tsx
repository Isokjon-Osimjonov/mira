import { useQuery } from '@tanstack/react-query'
import { Activity, Database, Server, Workflow, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { api } from '../../lib/api'
import { cn } from '@/lib/utils'

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / (3600*24))
  const h = Math.floor(seconds % (3600*24) / 3600)
  const m = Math.floor(seconds % 3600 / 60)
  if (d > 0) return `${d} kun ${h} soat`
  if (h > 0) return `${h} soat ${m} daqiqa`
  return `${m} daqiqa`
}

export function SystemHealthPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => api.get('/health').then(res => res.data.data),
    refetchInterval: 10_000,
  })

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Yuklanmoqda...</div>
  }

  if (isError || !data) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-xl border border-red-100">
        <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-700 font-medium">Tizim holatini olishda xatolik</p>
      </div>
    )
  }

  const { services, uptime, version, env, timestamp } = data

  const StatusCard = ({ title, icon: Icon, status, details, link }: any) => {
    const isOk = status?.startsWith('ok') || status === 'running'
    return (
      <div className="bg-white rounded-xl border-[0.5px] border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-lg", isOk ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
              <Icon className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
          </div>
          {isOk ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" strokeWidth={1.5} />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" strokeWidth={1.5} />
          )}
        </div>
        
        <div className="space-y-2">
          {details.map((d: any, i: number) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{d.label}:</span>
              <span className="font-medium text-gray-900">{d.value}</span>
            </div>
          ))}
        </div>
        
        {link && (
          <a href={link} target="_blank" rel="noreferrer" className="block mt-4 text-xs text-primary font-medium hover:underline text-center">
            Batafsil ko'rish →
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Tizim holati</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Uptime: {formatUptime(uptime)}
            </span>
            <span>Versiya: {version}</span>
            <span>Muhit: {env}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Oxirgi tekshiruv: {new Date(timestamp).toLocaleTimeString()}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
        <StatusCard 
          title="API Server" 
          icon={Server} 
          status={data.status}
          details={[
            { label: 'Status', value: data.status === 'ok' ? 'Ishlayapti' : 'Xato' },
            { label: 'Uptime', value: formatUptime(uptime) }
          ]} 
        />
        
        <StatusCard 
          title="PostgreSQL" 
          icon={Database} 
          status={services?.database?.status}
          details={[
            { label: 'Status', value: services?.database?.status === 'ok' ? 'Ulangan' : 'Xato' },
            { label: 'Hovuz (Pool)', value: services?.database?.poolSize ?? 'N/A' },
            { label: 'Kutayotgan', value: services?.database?.waitingCount ?? 'N/A' }
          ]} 
        />
        
        <StatusCard 
          title="Redis" 
          icon={Database} 
          status={services?.redis?.status}
          details={[
            { label: 'Status', value: services?.redis?.status?.includes('ok') ? 'Ulangan' : 'Xato' },
            { label: 'Javob vaqti', value: services?.redis?.status?.replace('ok ', '') || 'N/A' }
          ]} 
        />

        <StatusCard 
          title="BullMQ (Navbatlar)" 
          icon={Workflow} 
          status={services?.bullmq ? 'ok' : 'error'}
          details={[
            { label: 'Jami kutayotgan', value: services?.bullmq?.waiting ?? 0 },
            { label: 'Faol jarayonlar', value: services?.bullmq?.active ?? 0 },
            { label: 'Kechiktirilgan', value: services?.bullmq?.delayed ?? 0 }
          ]} 
          link="/admin/queues"
        />
        
        <StatusCard 
          title="Telegram Bot" 
          icon={Activity} 
          status={services?.bot?.status}
          details={[
            { label: 'Status', value: services?.bot?.status === 'ok' ? 'Faol' : 'Xato' },
            { label: 'Username', value: services?.bot?.username || 'N/A' }
          ]} 
        />
      </div>
    </div>
  )
}
