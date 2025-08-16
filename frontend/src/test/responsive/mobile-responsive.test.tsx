import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { render, setMobileViewport, setTabletViewport, setDesktopViewport } from '@/test/utils'
import App from '@/App'
import ResearchPage from '@/pages/ResearchPage'
import Layout from '@/components/Layout'

// Mock hooks for consistent testing
vi.mock('@/hooks/useSearchHistory', () => ({
  default: () => ({
    searchHistory: [],
    addSearch: vi.fn(),
    updateSearchResults: vi.fn()
  })
}))

vi.mock('@/hooks/useFavorites', () => ({
  default: () => ({
    favorites: [],
    addToFavorites: vi.fn(),
    isInFavorites: vi.fn(() => false)
  })
}))

describe('Mobile Responsive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    setDesktopViewport() // Reset to desktop
  })

  describe('Viewport Detection and Layout Switching', () => {
    it('detects mobile viewport correctly', () => {
      setMobileViewport()
      render(<Layout><div>Test Content</div></Layout>)

      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument()
      expect(screen.queryByTestId('desktop-layout')).not.toBeInTheDocument()
    })

    it('detects tablet viewport correctly', () => {
      setTabletViewport()
      render(<Layout><div>Test Content</div></Layout>)

      // Tablet should use mobile layout but with tablet-specific classes
      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument()
      expect(screen.getByTestId('mobile-layout')).toHaveClass('tablet')
    })

    it('detects desktop viewport correctly', () => {
      setDesktopViewport()
      render(<Layout><div>Test Content</div></Layout>)

      expect(screen.getByTestId('desktop-layout')).toBeInTheDocument()
      expect(screen.queryByTestId('mobile-layout')).not.toBeInTheDocument()
    })

    it('switches layouts on viewport resize', () => {
      // Start with desktop
      setDesktopViewport()
      render(<Layout><div>Test Content</div></Layout>)

      expect(screen.getByTestId('desktop-layout')).toBeInTheDocument()

      // Resize to mobile
      setMobileViewport()
      fireEvent(window, new Event('resize'))

      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument()
      expect(screen.queryByTestId('desktop-layout')).not.toBeInTheDocument()
    })
  })

  describe('Mobile Navigation Responsive Behavior', () => {
    it('shows mobile bottom navigation on mobile screens', () => {
      setMobileViewport()
      render(<App />, { initialRoute: '/' })

      expect(screen.getByTestId('mobile-bottom-nav')).toBeInTheDocument()
      expect(screen.queryByTestId('desktop-nav')).not.toBeInTheDocument()
    })

    it('hides mobile navigation on desktop screens', () => {
      setDesktopViewport()
      render(<App />, { initialRoute: '/' })

      expect(screen.queryByTestId('mobile-bottom-nav')).not.toBeInTheDocument()
      expect(screen.getByTestId('desktop-nav')).toBeInTheDocument()
    })

    it('adjusts mobile navigation for safe areas', () => {
      setMobileViewport()
      
      // Mock device with safe area (iPhone with notch/home indicator)
      Object.defineProperty(document.documentElement.style, 'getPropertyValue', {
        value: (property: string) => {
          if (property === '--safe-area-inset-bottom') return '34px'
          if (property === '--safe-area-inset-top') return '44px'
          return '0px'
        }
      })

      render(<App />)

      const bottomNav = screen.getByTestId('mobile-bottom-nav')
      expect(bottomNav).toHaveClass('safe-area-pb')
    })
  })

  describe('Research Page Responsive Layout', () => {
    it('stacks form elements vertically on mobile', () => {
      setMobileViewport()
      render(<ResearchPage />)

      const formContainer = screen.getByTestId('research-form')
      expect(formContainer).toHaveClass('mobile-stack')

      // Form elements should be full width on mobile
      const queryInput = screen.getByLabelText(/research query/i)
      expect(queryInput).toHaveClass('w-full')

      const submitButton = screen.getByRole('button', { name: /start research/i })
      expect(submitButton).toHaveClass('w-full')
    })

    it('uses horizontal layout on desktop', () => {
      setDesktopViewport()
      render(<ResearchPage />)

      const formContainer = screen.getByTestId('research-form')
      expect(formContainer).toHaveClass('desktop-flex')

      // Form elements should have specific widths on desktop
      const queryInput = screen.getByLabelText(/research query/i)
      expect(queryInput).toHaveClass('flex-1')
    })

    it('adjusts progress tracker for mobile screens', () => {
      setMobileViewport()
      render(<ResearchPage />)

      // Start research to show progress tracker
      const submitButton = screen.getByRole('button', { name: /start research/i })
      const queryInput = screen.getByLabelText(/research query/i)
      
      fireEvent.change(queryInput, { target: { value: 'test query' } })
      fireEvent.click(submitButton)

      const progressTracker = screen.getByTestId('progress-tracker')
      expect(progressTracker).toHaveClass('mobile-compact')
    })
  })

  describe('Typography and Spacing Responsive Behavior', () => {
    it('uses mobile-optimized typography sizes', () => {
      setMobileViewport()
      render(<App />, { initialRoute: '/' })

      const heading = screen.getByRole('heading', { level: 1 })
      const styles = window.getComputedStyle(heading)
      
      // Should use smaller font size on mobile
      expect(parseInt(styles.fontSize)).toBeLessThan(48) // Desktop would be larger
    })

    it('uses appropriate touch targets on mobile', () => {
      setMobileViewport()
      render(<ResearchPage />)

      const buttons = screen.getAllByRole('button')
      
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button)
        const minHeight = parseInt(styles.minHeight)
        
        // Touch targets should be at least 44px for accessibility
        expect(minHeight).toBeGreaterThanOrEqual(44)
      })
    })

    it('adjusts spacing for different screen sizes', () => {
      // Mobile spacing
      setMobileViewport()
      render(<ResearchPage />)

      let container = screen.getByTestId('page-container')
      expect(container).toHaveClass('px-4', 'py-2') // Smaller padding on mobile

      // Desktop spacing
      setDesktopViewport()
      fireEvent(window, new Event('resize'))

      expect(container).toHaveClass('px-8', 'py-6') // Larger padding on desktop
    })
  })

  describe('Component Responsive Behavior', () => {
    it('shows/hides components based on screen size', () => {
      // Mobile: should hide sidebar, show mobile nav
      setMobileViewport()
      render(<App />)

      expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument()
      expect(screen.getByTestId('mobile-bottom-nav')).toBeInTheDocument()

      // Desktop: should show sidebar, hide mobile nav
      setDesktopViewport()
      fireEvent(window, new Event('resize'))

      expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument()
      expect(screen.queryByTestId('mobile-bottom-nav')).not.toBeInTheDocument()
    })

    it('adapts card layouts for different screen sizes', () => {
      setMobileViewport()
      render(<App />, { initialRoute: '/favorites' })

      // Mobile: cards should stack vertically
      const cardContainer = screen.getByTestId('cards-container')
      expect(cardContainer).toHaveClass('grid-cols-1')

      // Tablet: 2 columns
      setTabletViewport()
      fireEvent(window, new Event('resize'))
      expect(cardContainer).toHaveClass('grid-cols-2')

      // Desktop: 3+ columns
      setDesktopViewport()
      fireEvent(window, new Event('resize'))
      expect(cardContainer).toHaveClass('grid-cols-3')
    })
  })

  describe('Interaction Responsive Behavior', () => {
    it('enables touch-friendly interactions on mobile', () => {
      setMobileViewport()
      render(<ResearchPage />)

      const interactiveElements = screen.getAllByRole('button')
      
      interactiveElements.forEach(element => {
        // Should have touch-manipulation CSS for better touch response
        expect(element).toHaveClass('touch-manipulation')
        
        // Should have appropriate hover states (none on touch devices)
        expect(element).toHaveClass('hover:scale-105', 'active:scale-95')
      })
    })

    it('adjusts hover effects for touch devices', () => {
      setMobileViewport()
      
      // Mock touch device
      Object.defineProperty(window, 'ontouchstart', {
        value: {},
        writable: true
      })

      render(<ResearchPage />)

      const buttons = screen.getAllByRole('button')
      
      buttons.forEach(button => {
        // On touch devices, hover effects should be disabled/modified
        expect(button).not.toHaveClass('hover:bg-gray-100')
        expect(button).toHaveClass('active:bg-gray-100') // Use active states instead
      })
    })
  })

  describe('Content Responsive Layout', () => {
    it('handles content overflow on small screens', () => {
      setMobileViewport()
      render(<App />, { initialRoute: '/research' })

      // Long content should be truncated or scrollable on mobile
      const contentArea = screen.getByTestId('main-content')
      expect(contentArea).toHaveClass('overflow-auto')
      
      // Text should wrap appropriately
      const textElements = screen.getAllByText(/./i)
      textElements.forEach(element => {
        const styles = window.getComputedStyle(element)
        expect(styles.wordWrap).toBe('break-word')
      })
    })

    it('adjusts image sizes for different screens', () => {
      setMobileViewport()
      render(<App />, { initialRoute: '/' })

      const images = document.querySelectorAll('img')
      
      images.forEach(img => {
        // Images should be responsive
        expect(img).toHaveClass('max-w-full', 'h-auto')
        
        // Should have appropriate sizes for different breakpoints
        expect(img.getAttribute('sizes')).toContain('(max-width: 768px)')
      })
    })
  })

  describe('Performance on Mobile Devices', () => {
    it('lazy loads content on mobile for performance', () => {
      setMobileViewport()
      render(<App />, { initialRoute: '/history' })

      // Should use intersection observer for lazy loading
      const lazyElements = document.querySelectorAll('[data-lazy="true"]')
      expect(lazyElements.length).toBeGreaterThan(0)
    })

    it('reduces animations on mobile for better performance', () => {
      setMobileViewport()
      render(<App />)

      // Check for reduced motion preference
      const animatedElements = document.querySelectorAll('.animate-pulse, .animate-spin')
      
      // Should respect prefers-reduced-motion
      animatedElements.forEach(element => {
        expect(element).toHaveClass('motion-reduce:animate-none')
      })
    })
  })

  describe('Accessibility on Mobile Devices', () => {
    it('maintains proper focus management on mobile', () => {
      setMobileViewport()
      render(<ResearchPage />)

      const focusableElements = screen.getAllByRole('button')
      
      focusableElements.forEach(element => {
        // Should have visible focus indicators
        expect(element).toHaveClass('focus:outline-none', 'focus:ring-2')
        
        // Should be keyboard navigable
        expect(element).toHaveAttribute('tabindex')
      })
    })

    it('provides appropriate ARIA labels for mobile interactions', () => {
      setMobileViewport()
      render(<App />)

      const mobileNavButtons = screen.getAllByRole('link', { name: /home|search|history|saved/i })
      
      mobileNavButtons.forEach(button => {
        // Should have descriptive labels for screen readers
        expect(button).toHaveAttribute('aria-label')
      })
    })

    it('ensures adequate color contrast on mobile', () => {
      setMobileViewport()
      render(<ResearchPage />)

      const textElements = screen.getAllByRole('button')
      
      textElements.forEach(element => {
        const styles = window.getComputedStyle(element)
        
        // This is a simplified check - in reality you'd use a color contrast library
        expect(styles.color).toBeTruthy()
        expect(styles.backgroundColor).toBeTruthy()
      })
    })
  })

  describe('Orientation Changes', () => {
    it('handles portrait to landscape orientation change', () => {
      setMobileViewport()
      render(<App />, { initialRoute: '/research' })

      // Start in portrait
      Object.defineProperty(screen, 'orientation', {
        value: { angle: 0, type: 'portrait-primary' },
        configurable: true
      })

      let layout = screen.getByTestId('mobile-layout')
      expect(layout).toHaveClass('portrait')

      // Change to landscape
      Object.defineProperty(screen, 'orientation', {
        value: { angle: 90, type: 'landscape-primary' }
      })

      fireEvent(window, new Event('orientationchange'))

      expect(layout).toHaveClass('landscape')
    })

    it('adjusts keyboard handling for different orientations', () => {
      setMobileViewport()
      render(<ResearchPage />)

      const queryInput = screen.getByLabelText(/research query/i)

      // Portrait: normal keyboard behavior
      Object.defineProperty(screen, 'orientation', {
        value: { angle: 0, type: 'portrait-primary' }
      })

      fireEvent.focus(queryInput)
      
      // In portrait, should not adjust viewport
      const viewport = document.querySelector('meta[name="viewport"]')
      expect(viewport?.getAttribute('content')).not.toContain('user-scalable=no')

      // Landscape: prevent zoom on input focus
      Object.defineProperty(screen, 'orientation', {
        value: { angle: 90, type: 'landscape-primary' }
      })

      fireEvent(window, new Event('orientationchange'))
      fireEvent.focus(queryInput)

      // In landscape, might prevent scaling to avoid keyboard issues
      expect(viewport?.getAttribute('content')).toContain('width=device-width')
    })
  })
})