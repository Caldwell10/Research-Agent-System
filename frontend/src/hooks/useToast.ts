import { useState, useCallback } from 'react'
import { ToastProps } from '@/components/Toast'

type ToastType = ToastProps['type']

interface ToastInput {
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface UseToastReturn {
  toasts: ToastProps[]
  showToast: (toast: ToastInput) => string
  hideToast: (id: string) => void
  clearToasts: () => void
  showSuccess: (title: string, message?: string) => string
  showError: (title: string, message?: string) => string
  showInfo: (title: string, message?: string) => string
  showWarning: (title: string, message?: string) => string
  showOffline: () => string
  showOnline: () => string
}

const useToast = (): UseToastReturn => {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const showToast = useCallback((toast: ToastInput): string => {
    const id = Math.random().toString(36).substring(2, 9)
    
    const newToast: ToastProps = {
      id,
      ...toast,
      onClose: (toastId: string) => hideToast(toastId)
    }

    setToasts(prev => [...prev, newToast])
    return id
  }, [])

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  // Convenience methods
  const showSuccess = useCallback((title: string, message?: string): string => {
    return showToast({ type: 'success', title, message })
  }, [showToast])

  const showError = useCallback((title: string, message?: string): string => {
    return showToast({ type: 'error', title, message, duration: 7000 })
  }, [showToast])

  const showInfo = useCallback((title: string, message?: string): string => {
    return showToast({ type: 'info', title, message })
  }, [showToast])

  const showWarning = useCallback((title: string, message?: string): string => {
    return showToast({ type: 'warning', title, message, duration: 6000 })
  }, [showToast])

  const showOffline = useCallback((): string => {
    return showToast({
      type: 'offline',
      title: 'You\'re offline',
      message: 'Some features may not be available',
      duration: 0 // Persistent until dismissed
    })
  }, [showToast])

  const showOnline = useCallback((): string => {
    return showToast({
      type: 'online',
      title: 'Back online',
      message: 'All features are now available',
      duration: 3000
    })
  }, [showToast])

  return {
    toasts,
    showToast,
    hideToast,
    clearToasts,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showOffline,
    showOnline
  }
}

export default useToast