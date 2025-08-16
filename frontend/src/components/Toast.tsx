import React, { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, Info, X, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ToastProps {
  id: string
  type: 'success' | 'error' | 'info' | 'warning' | 'offline' | 'online'
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  onClose: (id: string) => void
}

const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  action,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // Animate in
    setIsVisible(true)

    // Auto dismiss
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [duration])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      onClose(id)
    }, 300) // Match animation duration
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />
      case 'error':
        return <AlertCircle className="w-5 h-5" />
      case 'warning':
        return <AlertCircle className="w-5 h-5" />
      case 'info':
        return <Info className="w-5 h-5" />
      case 'offline':
        return <WifiOff className="w-5 h-5" />
      case 'online':
        return <Wifi className="w-5 h-5" />
    }
  }

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200'
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
      case 'offline':
        return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200'
      case 'online':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
    }
  }

  return (
    <div
      className={cn(
        "pointer-events-auto w-full max-w-sm rounded-lg border shadow-lg backdrop-blur-sm",
        "transform transition-all duration-300 ease-out",
        getStyles(),
        isVisible && !isExiting
          ? "translate-x-0 opacity-100 scale-100"
          : "translate-x-full opacity-0 scale-95"
      )}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-medium">
              {title}
            </p>
            {message && (
              <p className="mt-1 text-sm opacity-80">
                {message}
              </p>
            )}
            {action && (
              <div className="mt-3">
                <button
                  onClick={action.onClick}
                  className="text-sm font-medium underline hover:no-underline transition-all"
                >
                  {action.label}
                </button>
              </div>
            )}
          </div>
          <div className="ml-4 flex flex-shrink-0">
            <button
              onClick={handleClose}
              className="inline-flex rounded-md p-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <span className="sr-only">Dismiss</span>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Toast