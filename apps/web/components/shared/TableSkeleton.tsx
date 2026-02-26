import Skeleton from './Skeleton';

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
}

export default function TableSkeleton({ columns = 6, rows = 8 }: TableSkeletonProps) {
  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 w-40 rounded-xl" />
        <Skeleton className="h-10 w-36 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {/* Header */}
        <div className="flex gap-4 p-4 border-b border-gray-200 dark:border-dark-border">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>

        {/* Rows */}
        {Array.from({ length: rows }).map((_, row) => (
          <div
            key={row}
            className="flex items-center gap-4 p-4 border-b border-gray-100 dark:border-dark-border/50 last:border-0"
          >
            {Array.from({ length: columns }).map((_, col) => (
              <Skeleton
                key={col}
                className={`h-4 flex-1 ${col === 0 ? 'max-w-[140px]' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
