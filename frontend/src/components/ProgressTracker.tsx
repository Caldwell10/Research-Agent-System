import React, { useEffect } from 'react'
import { X, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { ProgressTrackerProps } from '@/types/progress'
import useProgressTracker from '@/hooks/useProgressTracker'
import { cn } from '@/lib/utils'

const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  isActive,
  onCancel,
  onComplete,
  onError,
  query,
  className
}) => {
  const { progressState, stages, connected, start, reset, complete, error } = useProgressTracker()

  // Initialize progress tracking when becoming active
  useEffect(() => {
    if (isActive && query) {
      start(query)
    } else if (!isActive) {
      reset()
    }
  }, [isActive, query, start, reset])

  // Handle completion
  useEffect(() => {
    if (progressState.isComplete && onComplete) {
      onComplete(null) // Results will be handled by parent component
    }
  }, [progressState.isComplete, onComplete])

  // Handle errors
  useEffect(() => {
    if (progressState.hasError && onError) {
      onError(progressState.errorMessage || 'Unknown error')
    }
  }, [progressState.hasError, progressState.errorMessage, onError])

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`
    }
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  }

  const getStageIcon = (stage: typeof stages[0], index: number) => {
    if (stage.error) {
      return <AlertCircle className="w-5 h-5 text-red-500" />
    }
    if (stage.completed) {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    }
    if (stage.active) {
      return <Loader2 className="w-5 h-5 text-primary animate-spin" />
    }
    return (
      <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs font-medium">
        {index + 1}
      </div>
    )
  }

  if (!isActive) {
    return null
  }

  return (
    <div className={cn(
      "bg-card rounded-lg border border-border p-6 space-y-6 animate-slide-up",
      className
    )}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Research in Progress
          </h3>
          <p className="text-sm text-muted-foreground">
            Query: "<span className="text-foreground font-medium">{query}</span>"
          </p>
        </div>
        
        <button
          onClick={onCancel}
          className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="Cancel research"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Connection Status - Hidden from users */}

      {/* Overall Progress Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Overall Progress</span>
          <span className="text-foreground font-medium">
            {Math.round(progressState.overallProgress)}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-700 transition-all duration-500 ease-out rounded-full relative"
            style={{ width: `${progressState.overallProgress}%` }}
          >
            {/* Animated shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-pulse-slow" />
          </div>
        </div>
      </div>

      {/* Stage Indicators */}
      <div className="space-y-4">
        {stages.map((stage, index) => (
          <div key={stage.id} className="flex items-center space-x-4">
            {/* Stage Icon */}
            <div className={cn(
              "flex-shrink-0 transition-all duration-300",
              stage.active && "transform scale-110"
            )}>
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                stage.active && "bg-primary/10 ring-2 ring-primary/20 shadow-lg",
                stage.completed && "bg-green-50 dark:bg-green-900/20",
                stage.error && "bg-red-50 dark:bg-red-900/20",
                !stage.active && !stage.completed && !stage.error && "bg-muted"
              )}>
                {getStageIcon(stage, index)}
              </div>
            </div>

            {/* Stage Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className={cn(
                  "font-medium transition-colors duration-300",
                  stage.active ? "text-primary" : "text-foreground",
                  stage.completed && "text-green-600 dark:text-green-400",
                  stage.error && "text-red-600 dark:text-red-400"
                )}>
                  {stage.name}
                </h4>
                {stage.active && (
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                    <div className="w-1 h-1 bg-primary rounded-full animate-pulse delay-100" />
                    <div className="w-1 h-1 bg-primary rounded-full animate-pulse delay-200" />
                  </div>
                )}
              </div>
              <p className={cn(
                "text-sm transition-colors duration-300",
                stage.active ? "text-foreground" : "text-muted-foreground"
              )}>
                {stage.description}
              </p>
            </div>

            {/* Desktop: Progress Weight */}
            <div className="hidden md:flex flex-col items-end text-sm space-y-1">
              <span className="text-muted-foreground">
                {stage.progressWeight}%
              </span>
              {stage.completed && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Status and Details */}
      <div className="space-y-4 pt-4 border-t border-border">
        {/* Current Status */}
        <div className="flex items-start space-x-3">
          <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0 animate-pulse" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground font-medium leading-relaxed">
              {progressState.statusMessage}
            </p>
          </div>
        </div>

        {/* Research Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="space-y-1">
            <span className="text-muted-foreground">Papers Found</span>
            <div className="text-foreground font-semibold">
              {progressState.papers.found}
            </div>
          </div>
          
          <div className="space-y-1">
            <span className="text-muted-foreground">Papers Analyzed</span>
            <div className="text-foreground font-semibold">
              {progressState.papers.analyzed}
              {progressState.papers.total > 0 && ` / ${progressState.papers.total}`}
            </div>
          </div>

          {progressState.estimatedTimeRemaining && progressState.estimatedTimeRemaining > 0 && (
            <div className="space-y-1">
              <span className="text-muted-foreground">Time Remaining</span>
              <div className="text-foreground font-semibold flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{formatTime(progressState.estimatedTimeRemaining)}</span>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <span className="text-muted-foreground">Current Stage</span>
            <div className="text-foreground font-semibold capitalize">
              {progressState.currentStage || 'Preparing...'}
            </div>
          </div>
        </div>

        {/* Mobile: Condensed Progress Info */}
        <div className="md:hidden flex items-center justify-between text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
          <span>Stage {stages.findIndex(s => s.active) + 1} of {stages.length}</span>
          <span>{Math.round(progressState.overallProgress)}% complete</span>
        </div>
      </div>
    </div>
  )
}

export default ProgressTracker