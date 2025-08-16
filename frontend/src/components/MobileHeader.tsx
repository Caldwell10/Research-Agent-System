import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MoreVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileHeaderProps {
  title: string
  showBack?: boolean
  onBack?: () => void
  actions?: React.ReactNode
  className?: string
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  showBack = false,
  onBack,
  actions,
  className
}) => {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate(-1)
    }
  }

  return (
    <header className={cn(
      "sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border",
      "safe-area-pt", // For devices with notch
      className
    )}>
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left side - Back button or spacer */}
        <div className="flex items-center min-w-0">
          {showBack ? (
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors touch-manipulation"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-9" /> // Spacer for centering title
          )}
        </div>

        {/* Center - Title */}
        <div className="flex-1 flex items-center justify-center px-4 min-w-0">
          <h1 className="text-lg font-semibold text-foreground truncate text-center">
            {title}
          </h1>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-2 min-w-0">
          {actions || <div className="w-9" />} {/* Spacer if no actions */}
        </div>
      </div>
    </header>
  )
}

export default MobileHeader