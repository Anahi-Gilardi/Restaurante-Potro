import React from 'react';

interface SkeletonProps {
  className?: string;
  count?: number;
  type?: 'card' | 'row' | 'circle' | 'text';
}

export default function Skeleton({ className = '', count = 1, type = 'text' }: SkeletonProps) {
  const baseClass = 'bg-gradient-to-r from-stone-200 via-stone-100 to-stone-200 animate-pulse rounded';

  const styles: Record<string, string> = {
    card: `${baseClass} h-28 w-full rounded-xl`,
    row: `${baseClass} h-12 w-full rounded-lg`,
    circle: `${baseClass} h-10 w-10 rounded-full`,
    text: `${baseClass} h-4 w-full rounded`,
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${styles[type]} ${className}`} />
      ))}
    </>
  );
}

export function CardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3 bg-white border border-stone-200 rounded-2xl flex gap-3">
          <Skeleton type="card" className="!w-16 !h-16 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="!h-3 w-1/3" />
            <Skeleton className="!h-4 w-2/3" />
            <Skeleton className="!h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-4 pb-2 border-b border-stone-100">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="!h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-2 border-b border-stone-50">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={`!h-4 ${c === 0 ? 'flex-[2]' : 'flex-1'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 bg-white border border-stone-100 rounded-2xl">
          <Skeleton type="circle" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="!h-4 w-1/2" />
            <Skeleton className="!h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
