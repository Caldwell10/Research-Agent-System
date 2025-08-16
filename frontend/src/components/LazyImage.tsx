import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface LazyImageProps {
  src: string
  alt: string
  placeholder?: string
  fallback?: string
  className?: string
  width?: number | string
  height?: number | string
  onLoad?: () => void
  onError?: () => void
  threshold?: number
  rootMargin?: string
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder,
  fallback,
  className,
  width,
  height,
  onLoad,
  onError,
  threshold = 0.1,
  rootMargin = '50px'
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (!imgRef.current) return

    // Create intersection observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting) {
          setIsVisible(true)
          // Stop observing once visible
          if (observerRef.current && imgRef.current) {
            observerRef.current.unobserve(imgRef.current)
          }
        }
      },
      {
        threshold,
        rootMargin
      }
    )

    observerRef.current.observe(imgRef.current)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [threshold, rootMargin])

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setIsError(true)
    onError?.()
  }

  const getImageSrc = () => {
    if (isError && fallback) return fallback
    if (isVisible) return src
    return placeholder || ''
  }

  return (
    <div 
      className={cn("relative overflow-hidden bg-muted", className)}
      style={{ width, height }}
    >
      {/* Placeholder/Loading state */}
      {!isLoaded && !isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
          <div className="w-8 h-8 bg-muted-foreground/20 rounded-full" />
        </div>
      )}

      {/* Error state */}
      {isError && !fallback && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-2 opacity-50">
              ❌
            </div>
            <div className="text-xs">Failed to load</div>
          </div>
        </div>
      )}

      {/* Actual image */}
      <img
        ref={imgRef}
        src={getImageSrc()}
        alt={alt}
        className={cn(
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0",
          "w-full h-full object-cover"
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        decoding="async"
      />
    </div>
  )
}

export default LazyImage