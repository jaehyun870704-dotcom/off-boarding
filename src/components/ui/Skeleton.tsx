interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-white/10 rounded-lg ${className}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}
