import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaginationProps {
  page: number
  total: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
  onPage: (page: number) => void
}

export function Pagination({ page, total, limit, hasNext, hasPrev, onPage }: PaginationProps) {
  const totalPages = Math.ceil(total / limit)
  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  return (
    <div
      className="flex items-center justify-between px-4 py-3
                    border-t border-border/50"
    >
      <p className="text-xs text-muted-foreground">
        {from}–{to} / jami {total} ta
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPage(page - 1)}
          disabled={!hasPrev}
          className="h-7 w-7 p-0"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs px-2 text-muted-foreground">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPage(page + 1)}
          disabled={!hasNext}
          className="h-7 w-7 p-0"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
