import React, { useRef, useCallback, useEffect, useState } from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  overscan?: number;
  maxHeight?: string;
}

export default function VirtualizedList<T>({
  items, renderItem, itemHeight, overscan = 3, maxHeight = '60vh'
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setContainerHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    if (containerRef.current) setScrollTop(containerRef.current.scrollTop);
  }, []);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan);
  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  return (
    <div ref={containerRef} onScroll={handleScroll}
      className="scroll-passive overflow-y-auto" style={{ maxHeight, willChange: 'scroll-position' }}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, i) => (
            <div key={startIndex + i} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PaginatedList<T>({ items, renderItem, pageSize = 15, className = '' }: {
  items: T[]; renderItem: (item: T, index: number) => React.ReactNode; pageSize?: number; className?: string;
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(items.length / pageSize);
  const paginatedItems = items.slice(0, page * pageSize);
  const hasMore = page < totalPages;

  return (
    <div className={className}>
      {paginatedItems.map((item, i) => <div key={i}>{renderItem(item, i)}</div>)}
      {hasMore && (
        <button onClick={() => setPage(p => p + 1)}
          className="w-full py-4 mt-2 text-xs font-bold text-[#624A3E] bg-stone-50 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer touch-target">
          Cargar más ({items.length - paginatedItems.length} restantes)
        </button>
      )}
    </div>
  );
}
