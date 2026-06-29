import React from 'react'
import { cn } from '@/lib/utils'
import { SkeletonTable } from './SkeletonTable'
import { EmptyState } from './EmptyState'

interface Column<T> {
  key: string
  header: React.ReactNode
  width?: string
  cell: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  onRowClick?: (row: T) => void
  rowKey: (row: T) => string
  stickyFirstCol?: boolean
}

export function DataTable<T>({
  data,
  columns,
  loading,
  onRowClick,
  rowKey,
  stickyFirstCol,
}: DataTableProps<T>) {
  if (loading) return <SkeletonTable cols={columns.length} />

  return (
    <div className="relative w-full overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50">
            {columns.map((col, i) => (
              <th
                key={col.key}
                className={cn(
                  'h-10 px-4 text-left text-xs font-medium',
                  'text-muted-foreground bg-gray-50/80',
                  'whitespace-nowrap',
                  i === 0 && stickyFirstCol ? 'sticky left-0 z-10 bg-gray-50' : '',
                  col.className
                )}
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="h-32 text-center">
                <EmptyState message="Ma'lumot topilmadi" />
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-b border-border/30 transition-colors',
                  onRowClick ? 'hover:bg-gray-50/80 cursor-pointer' : ''
                )}
              >
                {columns.map((col, i) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 align-middle',
                      i === 0 && stickyFirstCol ? 'sticky left-0 bg-white z-10' : '',
                      col.className
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
