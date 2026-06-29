export function SkeletonTable({ cols = 5, rows = 8 }) {
  return (
    <div className="w-full">
      <div className="border-b border-border/50 bg-gray-50/80 h-10" />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 px-4 py-3
                                 border-b border-border/30"
        >
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className="h-4 bg-gray-100 rounded animate-pulse"
              style={{ width: j === 0 ? '120px' : '80px' }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
