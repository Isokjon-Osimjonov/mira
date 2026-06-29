import React from 'react'
import { Inbox } from 'lucide-react'

export function EmptyState({
  message = "Ma'lumot topilmadi",
  description,
  action,
}: {
  message?: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div
      className="flex flex-col items-center justify-center
                    py-12 px-4 text-center"
    >
      <div
        className="w-12 h-12 rounded-full bg-gray-100
                      flex items-center justify-center mb-3"
      >
        <Inbox className="h-5 w-5 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-700">{message}</p>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
