import { useEffect, useRef, useState } from 'react'

interface SwipeCallbacks {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onTap?: () => void
  onLongPress?: () => void
}

interface SwipeOptions {
  threshold?: number // Minimum distance for swipe
  velocity?: number // Minimum velocity for swipe
  restrain?: number // Maximum perpendicular distance
  allowPageScroll?: boolean
  longPressDelay?: number
}

interface TouchPoint {
  x: number
  y: number
  time: number
}

const useSwipeGestures = (
  callbacks: SwipeCallbacks,
  options: SwipeOptions = {}
) => {
  const {
    threshold = 100,
    velocity = 0.3,
    restrain = 100,
    allowPageScroll = true,
    longPressDelay = 500
  } = options

  const elementRef = useRef<HTMLElement>(null)
  const [touchStart, setTouchStart] = useState<TouchPoint | null>(null)
  const [isLongPress, setIsLongPress] = useState(false)
  const longPressTimer = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    let startTouch: TouchPoint | null = null

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0]
        startTouch = {
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now()
        }
        setTouchStart(startTouch)
        setIsLongPress(false)

        // Start long press timer
        if (callbacks.onLongPress) {
          longPressTimer.current = setTimeout(() => {
            setIsLongPress(true)
            callbacks.onLongPress?.()
          }, longPressDelay)
        }

        if (!allowPageScroll) {
          e.preventDefault()
        }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!startTouch || e.touches.length !== 1) return

      // Clear long press timer on move
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }

      if (!allowPageScroll) {
        e.preventDefault()
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      // Clear long press timer
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }

      if (!startTouch || isLongPress) {
        setIsLongPress(false)
        return
      }

      const touch = e.changedTouches[0]
      const endTouch: TouchPoint = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      }

      const deltaX = endTouch.x - startTouch.x
      const deltaY = endTouch.y - startTouch.y
      const deltaTime = endTouch.time - startTouch.time
      
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)
      
      const swipeVelocity = Math.max(absX, absY) / deltaTime

      // Check if it's a tap (small movement, short time)
      if (absX < 10 && absY < 10 && deltaTime < 300) {
        callbacks.onTap?.()
        return
      }

      // Check if movement is sufficient for swipe
      if (Math.max(absX, absY) < threshold || swipeVelocity < velocity) {
        return
      }

      // Determine swipe direction
      if (absX > absY) {
        // Horizontal swipe
        if (absY > restrain) return // Too much vertical movement
        
        if (deltaX > 0) {
          callbacks.onSwipeRight?.()
        } else {
          callbacks.onSwipeLeft?.()
        }
      } else {
        // Vertical swipe
        if (absX > restrain) return // Too much horizontal movement
        
        if (deltaY > 0) {
          callbacks.onSwipeDown?.()
        } else {
          callbacks.onSwipeUp?.()
        }
      }

      setTouchStart(null)
      setIsLongPress(false)
    }

    const handleTouchCancel = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
      setTouchStart(null)
      setIsLongPress(false)
    }

    // Add touch event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: !allowPageScroll })
    element.addEventListener('touchmove', handleTouchMove, { passive: !allowPageScroll })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })
    element.addEventListener('touchcancel', handleTouchCancel, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchCancel)
      
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
    }
  }, [
    callbacks.onSwipeLeft,
    callbacks.onSwipeRight,
    callbacks.onSwipeUp,
    callbacks.onSwipeDown,
    callbacks.onTap,
    callbacks.onLongPress,
    threshold,
    velocity,
    restrain,
    allowPageScroll,
    longPressDelay,
    isLongPress
  ])

  return { elementRef, touchStart, isLongPress }
}

export default useSwipeGestures