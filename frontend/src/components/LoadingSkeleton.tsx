import React from 'react'
import { cn } from '@/lib/utils'

interface LoadingSkeletonProps {
  className?: string
  variant?: 'text' | 'rectangular' | 'circular' | 'card' | 'paper' | 'chart'
  lines?: number
  height?: string | number
  width?: string | number
  animate?: boolean
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className,
  variant = 'rectangular',
  lines = 1,
  height,
  width,
  animate = true
}) => {
  const baseClasses = cn(
    "bg-muted rounded",
    animate && "animate-pulse"
  )

  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return "h-4 rounded-md"
      case 'rectangular':
        return "rounded-md"
      case 'circular':
        return "rounded-full aspect-square"
      case 'card':
        return "h-48 rounded-lg"
      case 'paper':
        return "h-32 rounded-lg"
      case 'chart':
        return "h-64 rounded-lg"
      default:
        return "rounded-md"
    }
  }

  const style = {
    height: height,
    width: width
  }

  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              baseClasses,
              getVariantClasses(),
              index === lines - 1 ? "w-3/4" : "w-full"
            )}
            style={index === lines - 1 ? { ...style, width: "75%" } : style}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(baseClasses, getVariantClasses(), className)}
      style={style}
    />
  )
}

// Paper result skeleton
export const PaperSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("p-4 bg-background rounded-lg border border-border", className)}>
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <LoadingSkeleton variant="text" width="75%" height="20px" />
        <LoadingSkeleton variant="rectangular" width="60px" height="24px" />
      </div>
      <LoadingSkeleton variant="text" width="50%" height="16px" />
      <LoadingSkeleton variant="text" lines={3} height="14px" />
      <div className="flex items-center space-x-4">
        <LoadingSkeleton variant="text" width="80px" height="14px" />
        <LoadingSkeleton variant="text" width="60px" height="14px" />
      </div>
    </div>
  </div>
)

// Chart skeleton
export const ChartSkeleton: React.FC<{ className?: string; title?: string }> = ({ 
  className, 
  title 
}) => (
  <div className={cn("bg-card rounded-lg border border-border p-6", className)}>
    <div className="space-y-4">
      {title && (
        <div className="flex items-center justify-between">
          <LoadingSkeleton variant="text" width="150px" height="20px" />
          <LoadingSkeleton variant="rectangular" width="24px" height="24px" />
        </div>
      )}
      <LoadingSkeleton variant="chart" />
    </div>
  </div>
)

// Card skeleton
export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("bg-card rounded-lg border border-border p-6", className)}>
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <LoadingSkeleton variant="circular" width="40px" height="40px" />
        <div className="space-y-2 flex-1">
          <LoadingSkeleton variant="text" width="60%" height="16px" />
          <LoadingSkeleton variant="text" width="40%" height="14px" />
        </div>
      </div>
      <LoadingSkeleton variant="text" lines={2} height="14px" />
    </div>
  </div>
)

// Progress skeleton
export const ProgressSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("bg-card rounded-lg border border-border p-6", className)}>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <LoadingSkeleton variant="text" width="120px" height="20px" />
        <LoadingSkeleton variant="rectangular" width="60px" height="24px" />
      </div>
      
      {/* Progress steps */}
      <div className="space-y-4">
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex items-center space-x-4">
            <LoadingSkeleton variant="circular" width="32px" height="32px" />
            <div className="flex-1 space-y-2">
              <LoadingSkeleton variant="text" width="40%" height="16px" />
              <LoadingSkeleton variant="rectangular" width="100%" height="6px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)

// Search history skeleton
export const SearchHistorySkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("space-y-3", className)}>
    {Array.from({ length: 5 }).map((_, index) => (
      <div key={index} className="bg-card rounded-lg border border-border p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <LoadingSkeleton variant="text" width="60%" height="18px" />
            <LoadingSkeleton variant="rectangular" width="50px" height="20px" />
          </div>
          <div className="flex items-center space-x-4">
            <LoadingSkeleton variant="text" width="80px" height="14px" />
            <LoadingSkeleton variant="text" width="60px" height="14px" />
            <LoadingSkeleton variant="text" width="70px" height="14px" />
          </div>
        </div>
      </div>
    ))}
  </div>
)

export default LoadingSkeleton