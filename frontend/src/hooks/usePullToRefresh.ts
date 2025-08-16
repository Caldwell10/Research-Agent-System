import { useRef, useEffect, useState, useCallback } from 'react'

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void
  threshold?: number
  resistance?: number
  enabled?: boolean
}

interface PullToRefreshState {
  isPulling: boolean
  isRefreshing: boolean
  pullDistance: number
  shouldRefresh: boolean
}

const usePullToRefresh = (options: PullToRefreshOptions) => {
  const {
    onRefresh,
    threshold = 80,
    resistance = 2.5,
    enabled = true
  } = options

  const elementRef = useRef<HTMLElement>(null)
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
    shouldRefresh: false
  })

  const startY = useRef<number>(0)
  const currentY = useRef<number>(0)
  const isScrollAtTop = useRef<boolean>(true)

  const updatePullDistance = useCallback((distance: number) => {
    const adjustedDistance = Math.max(0, distance / resistance)
    const shouldRefresh = adjustedDistance >= threshold
    
    setState(prev => ({
      ...prev,
      pullDistance: adjustedDistance,
      shouldRefresh
    }))
  }, [threshold, resistance])

  const handleRefresh = useCallback(async () => {
    setState(prev => ({ ...prev, isRefreshing: true, isPulling: false }))
    
    try {
      await onRefresh()
    } finally {
      setState(prev => ({
        ...prev,
        isRefreshing: false,
        pullDistance: 0,
        shouldRefresh: false
      }))
    }
  }, [onRefresh])

  useEffect(() => {
    const element = elementRef.current
    if (!element || !enabled) return

    const checkScrollPosition = () => {
      isScrollAtTop.current = element.scrollTop <= 0
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1 && isScrollAtTop.current) {
        startY.current = e.touches[0].clientY
        currentY.current = startY.current
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1 || !isScrollAtTop.current) return

      currentY.current = e.touches[0].clientY
      const deltaY = currentY.current - startY.current

      if (deltaY > 0) {
        // Pulling down
        setState(prev => ({ ...prev, isPulling: true }))
        updatePullDistance(deltaY)
        
        // Prevent default scrolling when pulling
        e.preventDefault()
      }
    }

    const handleTouchEnd = () => {
      if (!state.isPulling) return

      if (state.shouldRefresh && !state.isRefreshing) {
        handleRefresh()
      } else {
        setState(prev => ({
          ...prev,
          isPulling: false,
          pullDistance: 0,
          shouldRefresh: false
        }))
      }
    }

    const handleScroll = () => {
      checkScrollPosition()
      
      // Reset state if user scrolls away from top
      if (!isScrollAtTop.current && state.isPulling) {
        setState(prev => ({
          ...prev,
          isPulling: false,
          pullDistance: 0,
          shouldRefresh: false
        }))
      }
    }

    // Initial scroll position check
    checkScrollPosition()

    // Add event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })
    element.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('scroll', handleScroll)
    }
  }, [enabled, state.isPulling, state.shouldRefresh, state.isRefreshing, updatePullDistance, handleRefresh])

  return {
    elementRef,
    ...state,
    refresh: handleRefresh
  }
}

export default usePullToRefresh