import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render, setMobileViewport, setDesktopViewport } from '@/test/utils'
import MobileBottomNav from '../MobileBottomNav'

describe('MobileBottomNav', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    setMobileViewport()
  })

  it('renders all navigation tabs', () => {
    render(<MobileBottomNav />)
    
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /search/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /history/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /saved/i })).toBeInTheDocument()
  })

  it('highlights active tab based on current route', () => {
    render(<MobileBottomNav />, { initialRoute: '/research' })
    
    const searchTab = screen.getByRole('link', { name: /search/i })
    expect(searchTab).toHaveClass('text-primary')
    
    const homeTab = screen.getByRole('link', { name: /home/i })
    expect(homeTab).toHaveClass('text-muted-foreground')
  })

  it('navigates to correct routes when tabs are clicked', async () => {
    render(<MobileBottomNav />)
    
    const historyTab = screen.getByRole('link', { name: /history/i })
    expect(historyTab).toHaveAttribute('href', '/history')
    
    const favoritesTab = screen.getByRole('link', { name: /saved/i })
    expect(favoritesTab).toHaveAttribute('href', '/favorites')
  })

  it('has proper touch targets for mobile', () => {
    render(<MobileBottomNav />)
    
    const tabs = screen.getAllByRole('link')
    tabs.forEach(tab => {
      expect(tab).toHaveClass('touch-manipulation')
      // Check minimum touch target size (44px)
      const styles = getComputedStyle(tab)
      expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44)
    })
  })

  it('shows active indicator for current tab', () => {
    render(<MobileBottomNav />, { initialRoute: '/favorites' })
    
    // Should show active indicator
    const activeIndicator = document.querySelector('.bg-primary.rounded-full')
    expect(activeIndicator).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(<MobileBottomNav />)
    
    const nav = screen.getByRole('navigation')
    expect(nav).toBeInTheDocument()
    
    const tabs = screen.getAllByRole('link')
    tabs.forEach(tab => {
      expect(tab).toHaveAttribute('href')
      expect(tab.textContent).toBeTruthy()
    })
  })

  it('renders with custom className', () => {
    const { container } = render(<MobileBottomNav className="custom-class" />)
    
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('handles safe area insets for devices with home indicator', () => {
    render(<MobileBottomNav />)
    
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveClass('safe-area-pb')
  })

  it('uses appropriate icons for each tab', () => {
    render(<MobileBottomNav />)
    
    // Check that icons are present (using data-testid or checking for icon containers)
    const iconContainers = document.querySelectorAll('.w-5.h-5')
    expect(iconContainers).toHaveLength(4) // One for each tab
  })

  it('maintains fixed positioning', () => {
    render(<MobileBottomNav />)
    
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveClass('fixed', 'bottom-0', 'left-0', 'right-0')
  })

  it('has proper z-index for overlay', () => {
    render(<MobileBottomNav />)
    
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveClass('z-50')
  })

  it('shows backdrop blur effect', () => {
    render(<MobileBottomNav />)
    
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveClass('backdrop-blur-sm')
  })
})