import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render, mockWebSocketEvents, setMobileViewport, setDesktopViewport } from '@/test/utils'
import App from '@/App'
import { mockSuccessfulResults, mockWebSocketEvents as mockWSData } from '@/test/mocks/data'

// Mock hooks
vi.mock('@/hooks/useSearchHistory', () => ({
  default: () => ({
    addSearch: vi.fn(() => 'search-123'),
    updateSearchResults: vi.fn(),
    searchHistory: [],
    clearHistory: vi.fn()
  })
}))

vi.mock('@/hooks/useFavorites', () => ({
  default: () => ({
    addToFavorites: vi.fn(),
    removeFromFavorites: vi.fn(),
    isInFavorites: vi.fn(() => false),
    favorites: [],
    clearFavorites: vi.fn()
  })
}))

// Mock touch events
const mockTouchEvent = (type: string, touches: Array<{ clientX: number; clientY: number }>) => {
  return new TouchEvent(type, {
    touches: touches.map(touch => ({ ...touch, identifier: 0, target: document.body })) as any,
    changedTouches: touches.map(touch => ({ ...touch, identifier: 0, target: document.body })) as any,
    targetTouches: touches.map(touch => ({ ...touch, identifier: 0, target: document.body })) as any
  })
}

describe('Mobile User Flow Tests', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    setMobileViewport()
    mockWebSocketEvents.reset()
    vi.clearAllMocks()
  })

  afterEach(() => {
    setDesktopViewport()
  })

  describe('Mobile Navigation Flow', () => {
    it('navigates through app using bottom navigation', async () => {
      render(<App />, { initialRoute: '/' })

      // Should show mobile bottom navigation
      const bottomNav = screen.getByTestId('mobile-bottom-nav')
      expect(bottomNav).toBeInTheDocument()

      // Test navigation to research page
      const researchTab = within(bottomNav).getByRole('link', { name: /search/i })
      await user.click(researchTab)

      await waitFor(() => {
        expect(screen.getByLabelText(/research query/i)).toBeInTheDocument()
      })

      // Test navigation to history page
      const historyTab = within(bottomNav).getByRole('link', { name: /history/i })
      await user.click(historyTab)

      await waitFor(() => {
        expect(screen.getByText(/search history/i)).toBeInTheDocument()
      })

      // Test navigation to favorites page
      const favoritesTab = within(bottomNav).getByRole('link', { name: /saved/i })
      await user.click(favoritesTab)

      await waitFor(() => {
        expect(screen.getByText(/saved papers/i)).toBeInTheDocument()
      })

      // Test navigation back to home
      const homeTab = within(bottomNav).getByRole('link', { name: /home/i })
      await user.click(homeTab)

      await waitFor(() => {
        expect(screen.getByText(/multi-agent research tool/i)).toBeInTheDocument()
      })
    })

    it('shows active tab indicator correctly', async () => {
      render(<App />, { initialRoute: '/research' })

      const bottomNav = screen.getByTestId('mobile-bottom-nav')
      const researchTab = within(bottomNav).getByRole('link', { name: /search/i })

      // Research tab should be active
      expect(researchTab).toHaveClass('text-primary')

      // Navigate to history
      const historyTab = within(bottomNav).getByRole('link', { name: /history/i })
      await user.click(historyTab)

      await waitFor(() => {
        expect(historyTab).toHaveClass('text-primary')
        expect(researchTab).toHaveClass('text-muted-foreground')
      })
    })
  })

  describe('Mobile Research Flow', () => {
    it('completes research workflow on mobile', async () => {
      render(<App />, { initialRoute: '/research' })

      // Mobile layout should be active
      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument()

      // Fill out research form
      const queryInput = screen.getByLabelText(/research query/i)
      await user.type(queryInput, 'mobile research test')

      // Submit using floating action button if present, or regular submit
      const submitButton = screen.getByRole('button', { name: /start research/i })
      await user.click(submitButton)

      // Should show mobile-optimized progress tracker
      await waitFor(() => {
        expect(screen.getByTestId('mobile-progress-tracker')).toBeInTheDocument()
      })

      // Simulate progress updates
      mockWebSocketEvents.emitMessage('progress_update', {
        stage: 'research',
        progress: 50,
        message: 'Searching for papers...'
      })

      await waitFor(() => {
        expect(screen.getByText(/searching for papers/i)).toBeInTheDocument()
        const progressBar = screen.getByRole('progressbar')
        expect(progressBar).toHaveAttribute('aria-valuenow', '50')
      })

      // Complete research
      mockWebSocketEvents.emitMessage('research_complete', mockWSData.complete.data)

      await waitFor(() => {
        expect(screen.getByText(/research complete/i)).toBeInTheDocument()
      })

      // Results should display in mobile-friendly format
      const paperCards = screen.getAllByTestId(/mobile-paper-card/)
      expect(paperCards).toHaveLength(5)
    })

    it('handles pull-to-refresh functionality', async () => {
      render(<App />, { initialRoute: '/research' })

      // Complete a research first
      const queryInput = screen.getByLabelText(/research query/i)
      await user.type(queryInput, 'pull to refresh test')
      await user.click(screen.getByRole('button', { name: /start research/i }))

      mockWebSocketEvents.emitMessage('research_complete', mockWSData.complete.data)

      await waitFor(() => {
        expect(screen.getByText(/research complete/i)).toBeInTheDocument()
      })

      // Simulate pull-to-refresh gesture
      const resultsContainer = screen.getByTestId('results-container')
      
      // Touch start at top
      fireEvent.touchStart(resultsContainer, {
        touches: [{ clientX: 200, clientY: 50 }]
      })

      // Touch move down (pull gesture)
      fireEvent.touchMove(resultsContainer, {
        touches: [{ clientX: 200, clientY: 150 }]
      })

      // Touch end
      fireEvent.touchEnd(resultsContainer, {
        changedTouches: [{ clientX: 200, clientY: 150 }]
      })

      // Should trigger refresh
      await waitFor(() => {
        expect(screen.getByTestId('pull-to-refresh-indicator')).toBeInTheDocument()
      })
    })
  })

  describe('Touch Gesture Interactions', () => {
    it('handles swipe gestures between papers', async () => {
      render(<App />, { initialRoute: '/research' })

      // Complete research to get results
      const queryInput = screen.getByLabelText(/research query/i)
      await user.type(queryInput, 'swipe test')
      await user.click(screen.getByRole('button', { name: /start research/i }))

      mockWebSocketEvents.emitMessage('research_complete', mockWSData.complete.data)

      await waitFor(() => {
        expect(screen.getByText(/research complete/i)).toBeInTheDocument()
      })

      const paperCards = screen.getAllByTestId(/swipeable-paper-card/)
      const firstCard = paperCards[0]

      // Simulate swipe right gesture
      fireEvent.touchStart(firstCard, {
        touches: [{ clientX: 50, clientY: 200 }]
      })

      fireEvent.touchMove(firstCard, {
        touches: [{ clientX: 200, clientY: 200 }]
      })

      fireEvent.touchEnd(firstCard, {
        changedTouches: [{ clientX: 200, clientY: 200 }]
      })

      // Should reveal swipe actions (like favorite, export, etc.)
      await waitFor(() => {
        expect(screen.getByTestId('swipe-actions')).toBeInTheDocument()
      })
    })

    it('handles long press for context menu', async () => {
      render(<App />, { initialRoute: '/research' })

      // Complete research
      const queryInput = screen.getByLabelText(/research query/i)
      await user.type(queryInput, 'long press test')
      await user.click(screen.getByRole('button', { name: /start research/i }))

      mockWebSocketEvents.emitMessage('research_complete', mockWSData.complete.data)

      await waitFor(() => {
        expect(screen.getByText(/research complete/i)).toBeInTheDocument()
      })

      const paperCards = screen.getAllByTestId(/paper-card/)
      const firstCard = paperCards[0]

      // Simulate long press
      fireEvent.touchStart(firstCard, {
        touches: [{ clientX: 200, clientY: 200 }]
      })

      // Wait for long press duration
      await new Promise(resolve => setTimeout(resolve, 600))

      fireEvent.touchEnd(firstCard, {
        changedTouches: [{ clientX: 200, clientY: 200 }]
      })

      // Should show context menu
      await waitFor(() => {
        expect(screen.getByTestId('context-menu')).toBeInTheDocument()
      })
    })
  })

  describe('Mobile Layout and Responsiveness', () => {
    it('adapts layout for different mobile screen sizes', async () => {
      // Test small mobile (375px)
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

      render(<App />, { initialRoute: '/research' })

      // Should show compact mobile layout
      expect(screen.getByTestId('mobile-layout')).toHaveClass('mobile-small')

      // Test larger mobile/tablet (768px)
      Object.defineProperty(window, 'innerWidth', {
        value: 768,
      })
      Object.defineProperty(window, 'innerHeight', {
        value: 1024,
      })

      // Trigger resize
      fireEvent(window, new Event('resize'))

      await waitFor(() => {
        expect(screen.getByTestId('mobile-layout')).toHaveClass('mobile-large')
      })
    })

    it('handles orientation changes', async () => {
      render(<App />, { initialRoute: '/research' })

      // Start in portrait
      expect(screen.getByTestId('mobile-layout')).toHaveClass('portrait')

      // Simulate orientation change to landscape
      Object.defineProperty(screen, 'orientation', {
        value: { angle: 90, type: 'landscape-primary' }
      })

      fireEvent(window, new Event('orientationchange'))

      await waitFor(() => {
        expect(screen.getByTestId('mobile-layout')).toHaveClass('landscape')
      })

      // Layout should adjust for landscape
      expect(screen.getByTestId('mobile-header')).toHaveClass('landscape-header')
    })
  })

  describe('Mobile-Specific Components', () => {
    it('uses bottom sheet for filters and options', async () => {
      render(<App />, { initialRoute: '/research' })

      // Complete research to show results with filters
      const queryInput = screen.getByLabelText(/research query/i)
      await user.type(queryInput, 'filter test')
      await user.click(screen.getByRole('button', { name: /start research/i }))

      mockWebSocketEvents.emitMessage('research_complete', mockWSData.complete.data)

      await waitFor(() => {
        expect(screen.getByText(/research complete/i)).toBeInTheDocument()
      })

      // Click filters button to open bottom sheet
      const filtersButton = screen.getByRole('button', { name: /filters/i })
      await user.click(filtersButton)

      // Should show bottom sheet
      await waitFor(() => {
        expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument()
        expect(screen.getByTestId('bottom-sheet')).toHaveClass('open')
      })

      // Should have filter options
      expect(screen.getByLabelText(/relevance score/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/publication year/i)).toBeInTheDocument()

      // Close bottom sheet by tapping backdrop
      const backdrop = screen.getByTestId('bottom-sheet-backdrop')
      await user.click(backdrop)

      await waitFor(() => {
        expect(screen.getByTestId('bottom-sheet')).toHaveClass('closed')
      })
    })

    it('shows toast notifications properly on mobile', async () => {
      render(<App />, { initialRoute: '/research' })

      // Complete research
      const queryInput = screen.getByLabelText(/research query/i)
      await user.type(queryInput, 'toast test')
      await user.click(screen.getByRole('button', { name: /start research/i }))

      mockWebSocketEvents.emitMessage('research_complete', mockWSData.complete.data)

      await waitFor(() => {
        expect(screen.getByText(/research complete/i)).toBeInTheDocument()
      })

      // Add paper to favorites to trigger toast
      const favoriteButton = screen.getAllByLabelText(/save to favorites/i)[0]
      await user.click(favoriteButton)

      // Should show mobile-optimized toast
      await waitFor(() => {
        const toast = screen.getByTestId('mobile-toast')
        expect(toast).toBeInTheDocument()
        expect(toast).toHaveClass('mobile-toast')
      })

      // Toast should auto-dismiss
      await waitFor(() => {
        expect(screen.queryByTestId('mobile-toast')).not.toBeInTheDocument()
      }, { timeout: 4000 })
    })
  })

  describe('Offline Mobile Experience', () => {
    it('handles offline mode gracefully on mobile', async () => {
      render(<App />, { initialRoute: '/research' })

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      })

      fireEvent(window, new Event('offline'))

      // Should show offline indicator
      await waitFor(() => {
        expect(screen.getByTestId('offline-indicator')).toBeInTheDocument()
      })

      // Try to submit research while offline
      const queryInput = screen.getByLabelText(/research query/i)
      await user.type(queryInput, 'offline test')
      await user.click(screen.getByRole('button', { name: /start research/i }))

      // Should show offline message
      await waitFor(() => {
        expect(screen.getByText(/you appear to be offline/i)).toBeInTheDocument()
        expect(screen.getByText(/request will be queued/i)).toBeInTheDocument()
      })

      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', {
        value: true,
      })

      fireEvent(window, new Event('online'))

      // Should show online indicator and sync queued requests
      await waitFor(() => {
        expect(screen.getByTestId('online-indicator')).toBeInTheDocument()
        expect(screen.getByText(/syncing queued requests/i)).toBeInTheDocument()
      })
    })

    it('shows cached results when offline', async () => {
      render(<App />, { initialRoute: '/research' })

      // Complete research while online first
      const queryInput = screen.getByLabelText(/research query/i)
      await user.type(queryInput, 'cache test')
      await user.click(screen.getByRole('button', { name: /start research/i }))

      mockWebSocketEvents.emitMessage('research_complete', mockWSData.complete.data)

      await waitFor(() => {
        expect(screen.getByText(/research complete/i)).toBeInTheDocument()
      })

      // Go offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
      })

      fireEvent(window, new Event('offline'))

      // Navigate away and back to trigger cache check
      const historyTab = screen.getByRole('link', { name: /history/i })
      await user.click(historyTab)

      const researchTab = screen.getByRole('link', { name: /search/i })
      await user.click(researchTab)

      // Should show cached results with offline indicator
      await waitFor(() => {
        expect(screen.getByText(/showing cached results/i)).toBeInTheDocument()
        expect(screen.getByTestId('offline-indicator')).toBeInTheDocument()
      })
    })
  })

  describe('Mobile Performance and Loading', () => {
    it('shows loading skeletons on mobile', async () => {
      render(<App />, { initialRoute: '/research' })

      const queryInput = screen.getByLabelText(/research query/i)
      await user.type(queryInput, 'skeleton test')
      await user.click(screen.getByRole('button', { name: /start research/i }))

      // Should show mobile loading skeletons
      await waitFor(() => {
        expect(screen.getAllByTestId('mobile-loading-skeleton')).toHaveLength(3)
      })

      // Complete research
      mockWebSocketEvents.emitMessage('research_complete', mockWSData.complete.data)

      // Skeletons should be replaced with actual content
      await waitFor(() => {
        expect(screen.queryByTestId('mobile-loading-skeleton')).not.toBeInTheDocument()
        expect(screen.getByText(/research complete/i)).toBeInTheDocument()
      })
    })

    it('implements infinite scroll for large result sets', async () => {
      // Mock large result set
      const largeResults = {
        ...mockSuccessfulResults,
        research_results: {
          papers: Array(50).fill(null).map((_, i) => ({
            ...mockSuccessfulResults.research_results.papers[0],
            id: `paper-${i}`,
            title: `Paper ${i + 1}`
          })),
          total_papers_found: 50
        }
      }

      render(<App />, { initialRoute: '/research' })

      const queryInput = screen.getByLabelText(/research query/i)
      await user.type(queryInput, 'infinite scroll test')
      await user.click(screen.getByRole('button', { name: /start research/i }))

      // Mock the research completion with large results
      mockWebSocketEvents.emitMessage('research_complete', {
        status: 'success',
        execution_time: 120.5,
        summary: { papers_found: 50, key_insights: 8 },
        data: largeResults
      })

      await waitFor(() => {
        expect(screen.getByText(/research complete/i)).toBeInTheDocument()
      })

      // Should initially show only first batch (e.g., 10 papers)
      let paperCards = screen.getAllByTestId(/paper-card/)
      expect(paperCards).toHaveLength(10)

      // Scroll to bottom to trigger infinite scroll
      const resultsContainer = screen.getByTestId('results-container')
      fireEvent.scroll(resultsContainer, {
        target: { scrollTop: resultsContainer.scrollHeight }
      })

      // Should load more papers
      await waitFor(() => {
        paperCards = screen.getAllByTestId(/paper-card/)
        expect(paperCards.length).toBeGreaterThan(10)
      })
    })
  })
})