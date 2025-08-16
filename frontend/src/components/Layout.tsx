import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '@/contexts/ThemeContext'
import { useHealthCheck } from '@/hooks/useResearch'
import { useWebSocket } from '@/contexts/WebSocketContext'
import useMobile from '@/hooks/useMobile'
import MobileBottomNav from './MobileBottomNav'
import { 
  Home, 
  Search, 
  History, 
  Heart,
  Sun, 
  Moon, 
  Wifi, 
  WifiOff,
  Activity,
  AlertCircle 
} from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { theme, toggleTheme } = useTheme()
  const { connected } = useWebSocket()
  const { data: health, isLoading: healthLoading } = useHealthCheck()
  const location = useLocation()
  const { isMobile } = useMobile()

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Research', href: '/research', icon: Search },
    { name: 'History', href: '/history', icon: History },
    { name: 'Favorites', href: '/favorites', icon: Heart },
  ]

  const getHealthColor = () => {
    if (healthLoading) return 'text-yellow-500'
    if (health?.status === 'healthy') return 'text-green-500'
    return 'text-red-500'
  }

  const getHealthIcon = () => {
    if (healthLoading) return <Activity className="w-4 h-4 animate-pulse" />
    if (health?.status === 'healthy') return <Activity className="w-4 h-4" />
    return <AlertCircle className="w-4 h-4" />
  }

  // Mobile layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        {/* Main Content */}
        <main className="flex-1 pb-16">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    )
  }

  // Desktop layout
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Search className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-xl text-foreground">
                  Multi-Agent Research
                </span>
              </Link>
            </div>

            <nav className="flex items-center space-x-4">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="flex items-center space-x-4">
              {/* WebSocket Status */}
              <div className="flex items-center space-x-2 text-sm">
                {connected ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
                <span className="text-muted-foreground hidden sm:inline">
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {/* Health Status */}
              <div className={`flex items-center space-x-1 ${getHealthColor()}`}>
                {getHealthIcon()}
                <span className="text-sm hidden sm:inline">
                  {healthLoading ? 'Checking...' : health?.status || 'Unknown'}
                </span>
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-sm text-muted-foreground">
            Multi-Agent Research Paper Analysis System
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout