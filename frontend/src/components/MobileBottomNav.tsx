import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Search, History, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TabItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
}

const tabs: TabItem[] = [
  { name: 'Home', href: '/', icon: Home, label: 'Home' },
  { name: 'Research', href: '/research', icon: Search, label: 'Search' },
  { name: 'History', href: '/history', icon: History, label: 'History' },
  { name: 'Favorites', href: '/favorites', icon: Heart, label: 'Saved' },
]

interface MobileBottomNavProps {
  className?: string
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ className }) => {
  const location = useLocation()

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border",
      "safe-area-pb", // For devices with home indicator
      className
    )}>
      <div className="flex items-center justify-around px-2 py-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = location.pathname === tab.href
          
          return (
            <Link
              key={tab.name}
              to={tab.href}
              className={cn(
                "flex flex-col items-center justify-center p-2 min-w-0 flex-1",
                "transition-all duration-200 ease-in-out",
                "rounded-lg touch-manipulation", // Better touch response
                isActive
                  ? "text-primary scale-105"
                  : "text-muted-foreground hover:text-foreground active:scale-95"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-6 h-6 mb-1",
                "transition-transform duration-200",
                isActive && "transform scale-110"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={cn(
                "text-xs font-medium leading-none",
                "transition-all duration-200",
                isActive ? "opacity-100" : "opacity-70"
              )}>
                {tab.label}
              </span>
              
              {/* Active indicator */}
              {isActive && (
                <div className="absolute -top-px left-1/2 transform -translate-x-1/2">
                  <div className="w-8 h-0.5 bg-primary rounded-full" />
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default MobileBottomNav