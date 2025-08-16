import React from 'react'
import { Plus, Search, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FloatingActionButtonProps {
  onClick: () => void
  icon?: 'plus' | 'search' | 'loading'
  label?: string
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left'
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  icon = 'plus',
  label,
  disabled = false,
  className,
  size = 'md',
  position = 'bottom-right'
}) => {
  const IconComponent = {
    plus: Plus,
    search: Search,
    loading: Loader2,
  }[icon]

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-14 h-14',
    lg: 'w-16 h-16',
  }

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-7 h-7',
  }

  const positionClasses = {
    'bottom-right': 'bottom-20 right-4',
    'bottom-center': 'bottom-20 left-1/2 transform -translate-x-1/2',
    'bottom-left': 'bottom-20 left-4',
  }

  return (
    <div className={cn("fixed z-50", positionClasses[position])}>
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "flex items-center justify-center",
          "bg-primary text-primary-foreground",
          "rounded-full shadow-lg",
          "transition-all duration-300 ease-out",
          "hover:scale-110 hover:shadow-xl",
          "active:scale-95",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
          "touch-manipulation",
          sizeClasses[size],
          // Extended FAB with label
          label && "flex-row space-x-3 px-6 rounded-full",
          label && size === 'sm' && "h-10",
          label && size === 'md' && "h-12",
          label && size === 'lg' && "h-14",
          className
        )}
        aria-label={label || 'Floating action button'}
      >
        <IconComponent 
          className={cn(
            iconSizes[size],
            icon === 'loading' && "animate-spin"
          )} 
        />
        {label && (
          <span className="font-medium text-sm whitespace-nowrap">
            {label}
          </span>
        )}
      </button>
    </div>
  )
}

export default FloatingActionButton