import React from 'react'
import { useLocation } from 'react-router-dom'
import useMobile from '@/hooks/useMobile'
import MobileBottomNav from './MobileBottomNav'
import MobileHeader from './MobileHeader'
import { cn } from '@/lib/utils'

interface MobileLayoutProps {
  children: React.ReactNode
  showHeader?: boolean
  showBottomNav?: boolean
  headerTitle?: string
  headerActions?: React.ReactNode
  className?: string
}

const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  showHeader = true,
  showBottomNav = true,
  headerTitle,
  headerActions,
  className
}) => {
  const { isMobile } = useMobile()
  const location = useLocation()

  // Auto-generate header title based on route
  const getHeaderTitle = () => {
    if (headerTitle) return headerTitle
    
    switch (location.pathname) {
      case '/': return 'Research AI'
      case '/research': return 'New Research'
      case '/history': return 'Search History'
      case '/favorites': return 'Favorites'
      default: return 'Research AI'
    }
  }

  if (!isMobile) {
    return <div className={className}>{children}</div>
  }

  return (
    <div className={cn(
      "min-h-screen bg-background flex flex-col",
      "overflow-hidden", // Prevent body scroll on mobile
      className
    )}>
      {/* Mobile Header */}
      {showHeader && (
        <MobileHeader 
          title={getHeaderTitle()}
          actions={headerActions}
        />
      )}

      {/* Main Content */}
      <main className={cn(
        "flex-1 overflow-y-auto",
        showBottomNav && "pb-16", // Account for bottom nav height
        showHeader && "pt-0" // Header is already positioned
      )}>
        {children}
      </main>

      {/* Bottom Navigation */}
      {showBottomNav && <MobileBottomNav />}
    </div>
  )
}

export default MobileLayout