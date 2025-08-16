import React, { useEffect, useRef } from 'react'
import { X, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  height?: 'auto' | 'half' | 'full'
  showHandle?: boolean
  closeOnBackdrop?: boolean
  className?: string
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  height = 'auto',
  showHandle = true,
  closeOnBackdrop = true,
  className
}) => {
  const sheetRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
    } else {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }

    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const heightClasses = {
    auto: 'max-h-[85vh]',
    half: 'h-[50vh]',
    full: 'h-[95vh]',
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === backdropRef.current) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div 
        className={cn(
          "absolute inset-0 bg-black/50 backdrop-blur-sm",
          "transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          "relative w-full bg-card rounded-t-2xl shadow-2xl",
          "transform transition-transform duration-300 ease-out",
          "border-t border-border",
          heightClasses[height],
          "overflow-hidden",
          isOpen ? "translate-y-0" : "translate-y-full",
          className
        )}
      >
        {/* Handle */}
        {showHandle && (
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
          </div>
        )}

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className={cn(
          "flex-1 overflow-y-auto",
          title ? "px-6 py-4" : "p-6"
        )}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default BottomSheet