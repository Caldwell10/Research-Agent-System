import { useState, useEffect } from 'react'

interface MobileState {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  screenSize: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  orientation: 'portrait' | 'landscape'
  touchSupported: boolean
}

const useMobile = (): MobileState => {
  const [state, setState] = useState<MobileState>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        screenSize: 'lg',
        orientation: 'landscape',
        touchSupported: false,
      }
    }

    return calculateMobileState()
  })

  useEffect(() => {
    const handleResize = () => {
      setState(calculateMobileState())
    }

    const handleOrientationChange = () => {
      // Small delay to ensure dimensions are updated
      setTimeout(() => {
        setState(calculateMobileState())
      }, 100)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleOrientationChange)

    // Also listen for screen orientation API if available
    if (screen?.orientation) {
      screen.orientation.addEventListener('change', handleOrientationChange)
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleOrientationChange)
      
      if (screen?.orientation) {
        screen.orientation.removeEventListener('change', handleOrientationChange)
      }
    }
  }, [])

  return state
}

function calculateMobileState(): MobileState {
  const width = window.innerWidth
  const height = window.innerHeight
  
  // Breakpoints (Tailwind CSS defaults)
  const breakpoints = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  }

  // Determine screen size
  let screenSize: MobileState['screenSize'] = 'sm'
  if (width >= breakpoints['2xl']) screenSize = '2xl'
  else if (width >= breakpoints.xl) screenSize = 'xl'
  else if (width >= breakpoints.lg) screenSize = 'lg'
  else if (width >= breakpoints.md) screenSize = 'md'
  else screenSize = 'sm'

  // Determine device type
  const isMobile = width < breakpoints.md
  const isTablet = width >= breakpoints.md && width < breakpoints.lg
  const isDesktop = width >= breakpoints.lg

  // Determine orientation
  const orientation: MobileState['orientation'] = height > width ? 'portrait' : 'landscape'

  // Check touch support
  const touchSupported = 'ontouchstart' in window || 
                        navigator.maxTouchPoints > 0 || 
                        (window as any).DocumentTouch && document instanceof (window as any).DocumentTouch

  return {
    isMobile,
    isTablet,
    isDesktop,
    screenSize,
    orientation,
    touchSupported,
  }
}

export default useMobile

// Utility hook for media queries
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches)
    
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [query])

  return matches
}