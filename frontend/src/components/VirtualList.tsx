import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  overscan?: number
  className?: string
  onEndReached?: () => void
  endReachedThreshold?: number
  loading?: boolean
  loadingComponent?: React.ReactNode
  emptyComponent?: React.ReactNode
}

function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className,
  onEndReached,
  endReachedThreshold = 0.8,
  loading = false,
  loadingComponent,
  emptyComponent
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const scrollElementRef = useRef<HTMLDivElement>(null)
  const hasReachedEnd = useRef(false)

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )
    
    return { startIndex, endIndex }
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length])

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1)
  }, [items, visibleRange.startIndex, visibleRange.endIndex])

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop: currentScrollTop, scrollHeight, clientHeight } = e.currentTarget
    setScrollTop(currentScrollTop)

    // Check if reached end
    if (onEndReached && !hasReachedEnd.current && !loading) {
      const scrollPercentage = (currentScrollTop + clientHeight) / scrollHeight
      
      if (scrollPercentage >= endReachedThreshold) {
        hasReachedEnd.current = true
        onEndReached()
        
        // Reset flag after a delay
        setTimeout(() => {
          hasReachedEnd.current = false
        }, 1000)
      }
    }
  }, [onEndReached, endReachedThreshold, loading])

  // Calculate total height
  const totalHeight = items.length * itemHeight

  // Empty state
  if (items.length === 0 && !loading) {
    return (
      <div className={cn("flex items-center justify-center", className)} style={{ height: containerHeight }}>
        {emptyComponent || (
          <div className="text-center text-muted-foreground">
            No items to display
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={scrollElementRef}
      className={cn("overflow-auto", className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Virtual spacer - represents all items */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items */}
        <div
          style={{
            transform: `translateY(${visibleRange.startIndex * itemHeight}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, virtualIndex) => {
            const actualIndex = visibleRange.startIndex + virtualIndex
            return (
              <div
                key={actualIndex}
                style={{ height: itemHeight }}
                className="w-full"
              >
                {renderItem(item, actualIndex)}
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          {loadingComponent || (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default VirtualList