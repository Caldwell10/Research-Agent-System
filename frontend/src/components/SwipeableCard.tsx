import React, { useState, useRef } from 'react'
import { Heart, ExternalLink, Share, Bookmark } from 'lucide-react'
import useSwipeGestures from '@/hooks/useSwipeGestures'
import { cn } from '@/lib/utils'

interface SwipeableCardProps {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onTap?: () => void
  onLongPress?: () => void
  showActions?: boolean
  className?: string
}

const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onTap,
  onLongPress,
  showActions = false,
  className
}) => {
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isActionVisible, setIsActionVisible] = useState(false)
  const startX = useRef<number>(0)

  const { elementRef } = useSwipeGestures({
    onSwipeLeft: () => {
      setIsActionVisible(false)
      onSwipeLeft?.()
    },
    onSwipeRight: () => {
      if (showActions) {
        setIsActionVisible(true)
      } else {
        onSwipeRight?.()
      }
    },
    onTap: () => {
      if (isActionVisible) {
        setIsActionVisible(false)
      } else {
        onTap?.()
      }
    },
    onLongPress
  }, {
    threshold: 50,
    velocity: 0.2
  })

  return (
    <div className="relative overflow-hidden">
      {/* Action buttons (revealed on swipe right) */}
      {showActions && (
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 flex items-center space-x-2 px-4 bg-primary/10 backdrop-blur-sm",
            "transition-transform duration-300 ease-out z-10",
            isActionVisible ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <button className="p-2 bg-red-500 text-white rounded-full shadow-lg hover:scale-110 transition-transform">
            <Heart className="w-4 h-4" />
          </button>
          <button className="p-2 bg-blue-500 text-white rounded-full shadow-lg hover:scale-110 transition-transform">
            <Bookmark className="w-4 h-4" />
          </button>
          <button className="p-2 bg-green-500 text-white rounded-full shadow-lg hover:scale-110 transition-transform">
            <Share className="w-4 h-4" />
          </button>
          <button className="p-2 bg-purple-500 text-white rounded-full shadow-lg hover:scale-110 transition-transform">
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main card content */}
      <div
        ref={elementRef as React.RefObject<HTMLDivElement>}
        className={cn(
          "relative bg-card rounded-lg border border-border transition-transform duration-300 ease-out",
          "touch-manipulation",
          isActionVisible && showActions && "translate-x-24",
          className
        )}
        style={{
          transform: `translateX(${swipeOffset}px)`
        }}
      >
        {children}
      </div>
    </div>
  )
}

export default SwipeableCard