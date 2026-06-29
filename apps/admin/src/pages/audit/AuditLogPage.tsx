import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Filter, CalendarDays, Key, Box, Settings, UserPlus, FileText } from 'lucide-react'
import { api } from '../../lib/api'
import { formatDateTime } from '../../utils/date'
import { SkeletonTable } from '../../components/shared/SkeletonTable'
import { EmptyState } from '../../components/shared/EmptyState'
import { Pagination } from '../../components/shared/Pagination'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const LIMIT = 50

const ACTION_LABELS: Record<string, string> = {
  'product:create': 'Mahsulot yaratildi',
  'product:update': 'Mahsulot tahrirlandi',
  'product:delete': "Mahsulot o'chirildi",
  'order:status': "Buyurtma holati o'zgartirildi",
  'coupon:create': 'Kupon yaratildi',
  'admin:invite': 'Admin taklif qilindi',
  'settings:update': 'Sozlamalar yangilandi',
  'auth:login': 'Tizimga kirdi',
  'auth:password': "Parol o'zgartirildi",
}

const ACTION_ICONS: Record<string, any> = {
  'product:create': Box,
  'product:update': Box,
  'product:delete': Box,
  'order:status': FileText,
  'coupon:create': Tag,
  'admin:invite': UserPlus,
  'settings:update': Settings,
  'auth:login': Key,
  'auth:password': Key,
}

// Fallback icon component if Tag is missing from lucide imports above
function Tag(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
      <path d="M7 7h.01" />
    </svg>
  )
}

export function AuditLogPage() {
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('_all')

  const queryParams = {
    page,
    limit: LIMIT,
    action: action === '_all' ? undefined : action,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', queryParams],
    queryFn: () =>
      api.get('/admin/auth/audit-logs', { params: queryParams }).then((res) => res.data),
  })

  const logs = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Audit loglari</h1>
          <p className="text-sm text-muted-foreground">Tizimdagi barcha o'zgarishlar tarixi</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="h-8 text-xs rounded-lg border-[0.5px] w-64 bg-white">
            <SelectValue placeholder="Amal turini tanlang" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="_all">Barcha amallar</SelectItem>
            {Object.entries(ACTION_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl border-[0.5px] border-border overflow-hidden">
        {isLoading ? (
          <SkeletonTable cols={4} rows={10} />
        ) : logs.length === 0 ? (
          <EmptyState
            message="Loglar topilmadi"
            description="Hozircha hech qanday amal bajarilmagan"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-gray-50/80">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground w-40">
                      Vaqt
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground w-48">
                      Admin
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground w-64">
                      Amal
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground min-w-[200px]">
                      Tafsilotlar
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {logs.map((log: any) => {
                    const Icon = ACTION_ICONS[log.action] || FileText
                    return (
                      <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3 align-top">
                          <span className="text-xs text-gray-600 whitespace-nowrap">
                            {formatDateTime(log.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">
                            {log.adminName || 'Tizim'}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {log.ipAddress}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-start gap-2">
                            <Icon
                              className="h-4 w-4 text-gray-400 mt-0.5 shrink-0"
                              strokeWidth={1.5}
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {ACTION_LABELS[log.action] || log.action}
                              </p>
                              {log.entityType && (
                                <p className="text-[11px] text-muted-foreground">
                                  {log.entityType}:{' '}
                                  <span className="font-mono">{log.entityId?.slice(0, 8)}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="text-xs text-gray-600 font-mono bg-gray-50 rounded p-2 max-h-24 overflow-y-auto whitespace-pre-wrap max-w-lg border border-border/30">
                            {log.newValue
                              ? JSON.stringify(log.newValue, null, 2)
                              : log.oldValue
                                ? JSON.stringify(log.oldValue, null, 2)
                                : '-'}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {meta && (
              <Pagination
                page={page}
                total={meta.total}
                limit={LIMIT}
                hasNext={meta.hasNext}
                hasPrev={meta.hasPrev}
                onPage={setPage}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
