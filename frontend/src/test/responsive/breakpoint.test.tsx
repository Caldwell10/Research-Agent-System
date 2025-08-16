import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { render } from '@/test/utils'
import { useMobile } from '@/hooks/useMobile'
import ResearchPage from '@/pages/ResearchPage'
import Layout from '@/components/Layout'

// Mock the useMobile hook for controlled testing
vi.mock('@/hooks/useMobile')

const mockUseMobile = vi.mocked(useMobile)

describe('Breakpoint Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Helper function to mock different screen sizes
  const mockBreakpoint = (breakpoint: 'sm' | 'md' | 'lg' | 'xl' | '2xl', isMobile = false, isTablet = false) => {
    mockUseMobile.mockReturnValue({
      isMobile,
      isTablet,
      isDesktop: !isMobile && !isTablet,
      screenSize: breakpoint,
      orientation: 'portrait',
      touchSupported: isMobile || isTablet
    })
  }

  describe('Small Mobile (sm) - 640px and below', () => {
    beforeEach(() => {
      mockBreakpoint('sm', true)
      
      // Mock window dimensions
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      })
    })

    it('shows compact mobile layout', () => {
      render(<Layout><div>Content</div></Layout>)

      const layout = screen.getByTestId('mobile-layout')
      expect(layout).toHaveClass('mobile-small')
      expect(layout).toHaveClass('px-4') // Smaller padding
    })

    it('stacks form elements vertically', () => {
      render(<ResearchPage />)

      const formContainer = screen.getByTestId('research-form')
      expect(formContainer).toHaveClass('flex-col', 'space-y-4')

      const queryInput = screen.getByLabelText(/research query/i)
      expect(queryInput).toHaveClass('w-full')

      const submitButton = screen.getByRole('button', { name: /start research/i })
      expect(submitButton).toHaveClass('w-full')
    })

    it('uses single column layout for cards', () => {
      render(<ResearchPage />)

      const resultsGrid = document.querySelector('[data-testid="results-grid"]')
      if (resultsGrid) {
        expect(resultsGrid).toHaveClass('grid-cols-1')
      }
    })

    it('shows condensed navigation', () => {
      render(<Layout><div>Content</div></Layout>)

      const mobileNav = screen.getByTestId('mobile-bottom-nav')
      expect(mobileNav).toHaveClass('compact')
      
      // Icons should be smaller
      const navIcons = document.querySelectorAll('[data-testid="nav-icon"]')
      navIcons.forEach(icon => {
        expect(icon).toHaveClass('w-5', 'h-5') // Smaller icons for small screens
      })
    })
  })

  describe('Medium Mobile/Large Phone (md) - 641px to 768px', () => {
    beforeEach(() => {
      mockBreakpoint('md', true)
      
      Object.defineProperty(window, 'innerWidth', {
        value: 700,
      })
      Object.defineProperty(window, 'innerHeight', {
        value: 800,
      })
    })

    it('shows standard mobile layout', () => {
      render(<Layout><div>Content</div></Layout>)

      const layout = screen.getByTestId('mobile-layout')
      expect(layout).toHaveClass('mobile-medium')
      expect(layout).toHaveClass('px-6') // Medium padding
    })

    it('can show some elements side by side', () => {
      render(<ResearchPage />)

      // Some form elements might be in a row at this size
      const formActions = screen.getByTestId('form-actions')
      expect(formActions).toHaveClass('flex-row', 'space-x-2')
    })

    it('uses standard navigation size', () => {
      render(<Layout><div>Content</div></Layout>)

      const mobileNav = screen.getByTestId('mobile-bottom-nav')
      expect(mobileNav).toHaveClass('standard')
      
      const navIcons = document.querySelectorAll('[data-testid="nav-icon"]')
      navIcons.forEach(icon => {
        expect(icon).toHaveClass('w-6', 'h-6') // Standard size icons
      })
    })
  })

  describe('Tablet (lg) - 769px to 1024px', () => {
    beforeEach(() => {
      mockBreakpoint('lg', false, true)
      
      Object.defineProperty(window, 'innerWidth', {
        value: 900,
      })
      Object.defineProperty(window, 'innerHeight', {
        value: 1200,
      })
    })

    it('shows tablet-optimized layout', () => {
      render(<Layout><div>Content</div></Layout>)

      const layout = screen.getByTestId('mobile-layout') // Still uses mobile layout but with tablet classes
      expect(layout).toHaveClass('tablet')
      expect(layout).toHaveClass('px-8') // Larger padding
    })

    it('shows form elements in flexible layout', () => {
      render(<ResearchPage />)

      const formContainer = screen.getByTestId('research-form')
      expect(formContainer).toHaveClass('tablet-flex')
      
      // Query input and max papers might be on same row
      const topRow = screen.getByTestId('form-top-row')
      expect(topRow).toHaveClass('flex-row', 'space-x-4')
    })

    it('uses two-column layout for cards', () => {
      render(<ResearchPage />)

      const resultsGrid = document.querySelector('[data-testid="results-grid"]')
      if (resultsGrid) {
        expect(resultsGrid).toHaveClass('grid-cols-2')
      }
    })

    it('shows enhanced navigation', () => {
      render(<Layout><div>Content</div></Layout>)

      const mobileNav = screen.getByTestId('mobile-bottom-nav')
      expect(mobileNav).toHaveClass('enhanced')
      
      // Might show labels alongside icons
      const navLabels = document.querySelectorAll('[data-testid="nav-label"]')
      expect(navLabels.length).toBeGreaterThan(0)
    })
  })

  describe('Small Desktop (xl) - 1025px to 1280px', () => {
    beforeEach(() => {
      mockBreakpoint('xl', false, false)
      
      Object.defineProperty(window, 'innerWidth', {
        value: 1200,
      })
      Object.defineProperty(window, 'innerHeight', {
        value: 800,
      })
    })

    it('shows desktop layout', () => {
      render(<Layout><div>Content</div></Layout>)

      expect(screen.getByTestId('desktop-layout')).toBeInTheDocument()
      expect(screen.queryByTestId('mobile-layout')).not.toBeInTheDocument()
    })

    it('shows horizontal form layout', () => {
      render(<ResearchPage />)

      const formContainer = screen.getByTestId('research-form')
      expect(formContainer).toHaveClass('desktop-flex')
      
      // All form elements should be in a row
      const queryInput = screen.getByLabelText(/research query/i)
      expect(queryInput).toHaveClass('flex-1')
      
      const submitButton = screen.getByRole('button', { name: /start research/i })
      expect(submitButton).toHaveClass('w-auto') // Not full width
    })

    it('uses three-column layout for cards', () => {
      render(<ResearchPage />)

      const resultsGrid = document.querySelector('[data-testid="results-grid"]')
      if (resultsGrid) {
        expect(resultsGrid).toHaveClass('grid-cols-3')
      }
    })

    it('shows desktop navigation', () => {
      render(<Layout><div>Content</div></Layout>)

      expect(screen.getByTestId('desktop-nav')).toBeInTheDocument()
      expect(screen.queryByTestId('mobile-bottom-nav')).not.toBeInTheDocument()
    })
  })

  describe('Large Desktop (2xl) - 1281px and above', () => {
    beforeEach(() => {
      mockBreakpoint('2xl', false, false)
      
      Object.defineProperty(window, 'innerWidth', {
        value: 1600,
      })
      Object.defineProperty(window, 'innerHeight', {
        value: 1000,
      })
    })

    it('shows expanded desktop layout', () => {
      render(<Layout><div>Content</div></Layout>)

      const layout = screen.getByTestId('desktop-layout')
      expect(layout).toHaveClass('desktop-large')
      expect(layout).toHaveClass('max-w-7xl') // Larger max width
    })

    it('uses four or more columns for cards', () => {
      render(<ResearchPage />)

      const resultsGrid = document.querySelector('[data-testid="results-grid"]')
      if (resultsGrid) {
        expect(resultsGrid).toHaveClass('grid-cols-4')
      }
    })

    it('shows sidebar alongside main content', () => {
      render(<Layout><div>Content</div></Layout>)

      expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument()
      
      const mainContent = screen.getByTestId('main-content')
      expect(mainContent).toHaveClass('sidebar-offset') // Adjusted for sidebar
    })
  })

  describe('Breakpoint Transitions', () => {
    it('smoothly transitions between mobile and tablet', () => {
      // Start with mobile
      mockBreakpoint('sm', true)
      const { rerender } = render(<Layout><div>Content</div></Layout>)

      expect(screen.getByTestId('mobile-layout')).toHaveClass('mobile-small')

      // Change to tablet
      mockBreakpoint('lg', false, true)
      rerender(<Layout><div>Content</div></Layout>)

      expect(screen.getByTestId('mobile-layout')).toHaveClass('tablet')
    })

    it('transitions from mobile to desktop correctly', () => {
      // Start with mobile
      mockBreakpoint('md', true)
      const { rerender } = render(<Layout><div>Content</div></Layout>)

      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument()

      // Change to desktop
      mockBreakpoint('xl', false, false)
      rerender(<Layout><div>Content</div></Layout>)

      expect(screen.getByTestId('desktop-layout')).toBeInTheDocument()
      expect(screen.queryByTestId('mobile-layout')).not.toBeInTheDocument()
    })

    it('handles window resize events correctly', () => {
      mockBreakpoint('md', true)
      render(<Layout><div>Content</div></Layout>)

      // Simulate window resize
      Object.defineProperty(window, 'innerWidth', { value: 1200 })
      mockBreakpoint('xl', false, false)
      
      fireEvent(window, new Event('resize'))

      // Should update layout based on new size
      expect(screen.getByTestId('desktop-layout')).toBeInTheDocument()
    })
  })

  describe('Conditional Rendering Based on Breakpoints', () => {
    it('shows/hides elements based on breakpoint', () => {
      // Mobile: hide advanced options
      mockBreakpoint('sm', true)
      render(<ResearchPage />)

      expect(screen.queryByTestId('advanced-options')).not.toBeInTheDocument()

      // Desktop: show advanced options
      mockBreakpoint('xl', false, false)
      render(<ResearchPage />)

      expect(screen.getByTestId('advanced-options')).toBeInTheDocument()
    })

    it('adjusts content density based on screen size', () => {
      // Mobile: compact content
      mockBreakpoint('sm', true)
      const { rerender } = render(<ResearchPage />)

      const contentArea = screen.getByTestId('main-content')
      expect(contentArea).toHaveClass('space-y-2') // Tight spacing

      // Desktop: spacious content
      mockBreakpoint('xl', false, false)
      rerender(<ResearchPage />)

      expect(contentArea).toHaveClass('space-y-6') // Loose spacing
    })
  })

  describe('Custom Breakpoint Behavior', () => {
    it('handles custom breakpoints correctly', () => {
      // Test edge case: exactly at breakpoint
      Object.defineProperty(window, 'innerWidth', { value: 768 })
      mockBreakpoint('md', true)
      
      render(<Layout><div>Content</div></Layout>)

      // Should still use mobile layout at exactly 768px
      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument()
    })

    it('respects user preference for compact layouts', () => {
      // Mock user preference for compact layout
      localStorage.setItem('layout-preference', 'compact')
      
      mockBreakpoint('xl', false, false)
      render(<Layout><div>Content</div></Layout>)

      const layout = screen.getByTestId('desktop-layout')
      expect(layout).toHaveClass('compact-mode')
    })

    it('handles extremely wide screens gracefully', () => {
      Object.defineProperty(window, 'innerWidth', { value: 3000 })
      mockBreakpoint('2xl', false, false)
      
      render(<Layout><div>Content</div></Layout>)

      const layout = screen.getByTestId('desktop-layout')
      // Should have max width constraint
      expect(layout).toHaveClass('max-w-7xl', 'mx-auto')
    })
  })

  describe('Accessibility at Different Breakpoints', () => {
    it('maintains proper focus order at all breakpoints', () => {
      const breakpoints = [
        { size: 'sm' as const, mobile: true },
        { size: 'lg' as const, tablet: true },
        { size: 'xl' as const, desktop: true }
      ]

      breakpoints.forEach(({ size, mobile = false, tablet = false, desktop = false }) => {
        mockBreakpoint(size, mobile, tablet)
        render(<ResearchPage />)

        const focusableElements = screen.getAllByRole('button')
        
        // Should have proper tab order regardless of layout
        focusableElements.forEach((element, index) => {
          const tabIndex = element.getAttribute('tabindex')
          if (tabIndex !== null) {
            expect(parseInt(tabIndex)).toBeGreaterThanOrEqual(0)
          }
        })
      })
    })

    it('provides appropriate touch targets at each breakpoint', () => {
      // Mobile: larger touch targets
      mockBreakpoint('sm', true)
      render(<ResearchPage />)

      let buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button)
        expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44)
      })

      // Desktop: can use smaller targets
      mockBreakpoint('xl', false, false)
      render(<ResearchPage />)

      buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        // Still accessible but can be smaller
        const styles = window.getComputedStyle(button)
        expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(32)
      })
    })
  })
})