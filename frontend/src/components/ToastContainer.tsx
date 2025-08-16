import React from 'react'
import Toast, { ToastProps } from './Toast'
import { cn } from '@/lib/utils'

interface ToastContainerProps {
  toasts: ToastProps[]
  onClose: (id: string) => void
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
  className?: string
}

const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onClose,
  position = 'top-right',
  className
}) => {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
  }

  if (toasts.length === 0) return null

  return (
    <div
      className={cn(
        "fixed z-50 pointer-events-none",
        positionClasses[position],
        className
      )}
    >
      <div className="space-y-3">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={onClose}
          />
        ))}
      </div>
    </div>
  )
}

export default ToastContainer