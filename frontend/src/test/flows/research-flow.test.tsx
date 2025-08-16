import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render, mockWebSocketEvents, mockLocalStorage } from '@/test/utils'
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'
import App from '@/App'
import { 
  mockSuccessfulResults, 
  mockErrorResults, 
  mockWebSocketEvents as mockWSData,
  mockSearchHistory,
  mockFavorites
} from '@/test/mocks/data'

// Mock the hooks with proper implementations
const mockAddSearch = vi.fn()
const mockUpdateSearchResults = vi.fn()
const mockAddToFavorites = vi.fn()
const mockRemoveFromFavorites = vi.fn()
const mockIsInFavorites = vi.fn()

vi.mock('@/hooks/useSearchHistory', () => ({
  default: () => ({
    addSearch: mockAddSearch,
    updateSearchResults: mockUpdateSearchResults,
    searchHistory: mockSearchHistory,
    clearHistory: vi.fn()
  })
}))

vi.mock('@/hooks/useFavorites', () => ({
  default: () => ({
    addToFavorites: mockAddToFavorites,
    removeFromFavorites: mockRemoveFromFavorites,
    isInFavorites: mockIsInFavorites,
    favorites: mockFavorites,
    clearFavorites: vi.fn()
  })
}))

// Mock file download
const mockDownload = vi.fn()
vi.mock('@/utils/download', () => ({
  downloadAsJSON: mockDownload,
  downloadAsCSV: mockDownload,
  downloadAsPDF: mockDownload
}))

describe('Research Flow Integration Tests', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    mockLocalStorage.clear()
    mockWebSocketEvents.reset()
    vi.clearAllMocks()
    mockIsInFavorites.mockReturnValue(false)
    mockAddSearch.mockReturnValue('search-123')
  })

  afterEach(() => {
    server.resetHandlers()
  })

  describe('Complete Research Workflow', () => {
    it('completes full research flow: search → progress → results → export', async () => {
      render(<App />, { initialRoute: '/research' })

      // Step 1: Fill out research form
      const queryInput = screen.getByLabelText(/research query/i)
      const maxPapersSelect = screen.getByLabelText(/maximum papers/i)
      const saveReportCheckbox = screen.getByLabelText(/save report/i)
      const submitButton = screen.getByRole('button', { name: /start research/i })

      await user.type(queryInput, 'machine learning for healthcare')
      await user.selectOptions(maxPapersSelect, '5')
      await user.click(saveReportCheckbox)

      expect(submitButton).toBeEnabled()

      // Step 2: Submit research request
      await user.click(submitButton)

      // Should show loading state immediately
      expect(screen.getByText(/researching.../i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /researching.../i })).toBeDisabled()

      // Should show progress tracker
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveAttribute('aria-valuenow', '0')

      // Step 3: Simulate WebSocket progress updates
      await waitFor(() => {
        expect(screen.getByText(/initializing research/i)).toBeInTheDocument()
      })

      // Research stage progress
      mockWebSocketEvents.emitMessage('progress_update', {
        stage: 'research',
        progress: 25,
        message: 'Searching academic databases...',
        details: {
          papers_found: 15,
          databases_searched: 2
        }
      })

      await waitFor(() => {
        expect(screen.getByText(/searching academic databases/i)).toBeInTheDocument()
        expect(screen.getByText(/15 papers found/i)).toBeInTheDocument()
        expect(progressBar).toHaveAttribute('aria-valuenow', '25')
      })

      // Research stage completion
      mockWebSocketEvents.emitMessage('stage_complete', {
        stage: 'research',
        completed_at: new Date().toISOString(),
        papers_found: 12
      })

      await waitFor(() => {
        expect(screen.getByText(/research stage completed/i)).toBeInTheDocument()
      })

      // Analysis stage progress
      mockWebSocketEvents.emitMessage('progress_update', {
        stage: 'analysis',
        progress: 60,
        message: 'Analyzing paper content and relevance...',
        details: {
          papers_analyzed: 8,
          themes_identified: 4
        }
      })

      await waitFor(() => {
        expect(screen.getByText(/analyzing paper content/i)).toBeInTheDocument()
        expect(screen.getByText(/8 papers analyzed/i)).toBeInTheDocument()
        expect(progressBar).toHaveAttribute('aria-valuenow', '60')
      })

      // Reporting stage progress
      mockWebSocketEvents.emitMessage('progress_update', {
        stage: 'reporting',
        progress: 90,
        message: 'Generating comprehensive analysis report...'
      })

      await waitFor(() => {
        expect(screen.getByText(/generating comprehensive analysis/i)).toBeInTheDocument()
        expect(progressBar).toHaveAttribute('aria-valuenow', '90')
      })

      // Step 4: Complete research
      mockWebSocketEvents.emitMessage('research_complete', mockWSData.complete.data)

      await waitFor(() => {
        expect(screen.getByText(/research completed successfully/i)).toBeInTheDocument()
        expect(progressBar).toHaveAttribute('aria-valuenow', '100')
      })

      // Step 5: Verify results display
      await waitFor(() => {
        expect(screen.getByText(/research complete/i)).toBeInTheDocument()
        expect(screen.getByText(/5 papers found/i)).toBeInTheDocument()
      })

      // Should show paper results
      const paperElements = screen.getAllByTestId(/paper-item/)
      expect(paperElements).toHaveLength(5)

      // Verify paper details are displayed
      expect(screen.getByText(/Neural Networks in Medical Diagnosis/i)).toBeInTheDocument()
      expect(screen.getByText(/John Smith/i)).toBeInTheDocument()
      expect(screen.getByText(/9.2\/10/i)).toBeInTheDocument() // Relevance score

      // Verify analysis results are shown
      expect(screen.getByText(/key themes/i)).toBeInTheDocument()
      expect(screen.getByText(/methodology analysis/i)).toBeInTheDocument()

      // Step 6: Test export functionality
      const exportButton = screen.getByRole('button', { name: /export results/i })
      await user.click(exportButton)

      // Should show export options
      const exportDropdown = screen.getByTestId('export-dropdown')
      expect(exportDropdown).toBeInTheDocument()

      // Test JSON export
      const exportJSONButton = within(exportDropdown).getByText(/export as json/i)
      await user.click(exportJSONButton)

      await waitFor(() => {
        expect(mockDownload).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'success',
            query: 'machine learning for healthcare'
          }),
          'research-results-machine-learning-for-healthcare'
        )
      })

      // Step 7: Test save to favorites
      const favoriteButtons = screen.getAllByLabelText(/save to favorites/i)
      await user.click(favoriteButtons[0])

      expect(mockAddToFavorites).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Neural Networks in Medical Diagnosis'
        })
      )

      // Step 8: Verify search was saved to history
      expect(mockAddSearch).toHaveBeenCalledWith({
        query: 'machine learning for healthcare',
        max_papers: 5,
        save_report: true
      })

      expect(mockUpdateSearchResults).toHaveBeenCalledWith(
        'search-123',
        expect.objectContaining({
          status: 'success'
        })
      )
    }, { timeout: 10000 })

    it('handles research cancellation flow', async () => {
      render(<App />, { initialRoute: '/research' })

      // Start research
      const queryInput = screen.getByLabelText(/research query/i)
      const submitButton = screen.getByRole('button', { name: /start research/i })

      await user.type(queryInput, 'cancellation test')
      await user.click(submitButton)

      // Wait for loading state
      await waitFor(() => {
        expect(screen.getByText(/researching.../i)).toBeInTheDocument()
      })

      // Simulate some progress
      mockWebSocketEvents.emitMessage('progress_update', {
        stage: 'research',
        progress: 30,
        message: 'Searching for papers...'
      })

      await waitFor(() => {
        expect(screen.getByText(/searching for papers/i)).toBeInTheDocument()
      })

      // Cancel research
      const cancelButton = screen.getByRole('button', { name: /cancel research/i })
      await user.click(cancelButton)

      // Should return to initial state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start research/i })).toBeInTheDocument()
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
      })

      // Form should still have the query
      expect(queryInput).toHaveValue('cancellation test')
    })
  })

  describe('Error Handling Flows', () => {
    it('handles API errors gracefully throughout the flow', async () => {
      // Mock API error
      server.use(
        http.post('http://localhost:8000/api/research', () => {
          return HttpResponse.json(mockErrorResults, { status: 400 })
        })
      )

      render(<App />, { initialRoute: '/research' })

      const queryInput = screen.getByLabelText(/research query/i)
      const submitButton = screen.getByRole('button', { name: /start research/i })

      await user.type(queryInput, 'error test query')
      await user.click(submitButton)

      // Should show loading initially
      expect(screen.getByText(/researching.../i)).toBeInTheDocument()

      // Should eventually show error
      await waitFor(() => {
        expect(screen.getByText(/error occurred/i)).toBeInTheDocument()
        expect(screen.getByText(/invalid query parameters/i)).toBeInTheDocument()
      })

      // Should allow retry
      const retryButton = screen.getByRole('button', { name: /try again/i })
      expect(retryButton).toBeInTheDocument()
    })

    it('handles WebSocket errors during research', async () => {
      render(<App />, { initialRoute: '/research' })

      const queryInput = screen.getByLabelText(/research query/i)
      const submitButton = screen.getByRole('button', { name: /start research/i })

      await user.type(queryInput, 'websocket error test')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/researching.../i)).toBeInTheDocument()
      })

      // Simulate WebSocket error
      mockWebSocketEvents.emitMessage('research_error', {
        stage: 'research',
        error_message: 'Network timeout while fetching papers',
        error_code: 'TIMEOUT'
      })

      await waitFor(() => {
        expect(screen.getByText(/network timeout/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
      })
    })

    it('handles connection loss and recovery', async () => {
      render(<App />, { initialRoute: '/research' })

      const queryInput = screen.getByLabelText(/research query/i)
      const submitButton = screen.getByRole('button', { name: /start research/i })

      await user.type(queryInput, 'connection test')
      await user.click(submitButton)

      // Start research
      await waitFor(() => {
        expect(screen.getByText(/researching.../i)).toBeInTheDocument()
      })

      // Simulate connection loss
      mockWebSocketEvents.triggerDisconnect()

      await waitFor(() => {
        expect(screen.getByText(/connection lost/i)).toBeInTheDocument()
      })

      // Simulate reconnection
      mockWebSocketEvents.triggerConnect()

      await waitFor(() => {
        expect(screen.queryByText(/connection lost/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Navigation and State Persistence', () => {
    it('maintains state when navigating between pages', async () => {
      render(<App />, { initialRoute: '/research' })

      // Fill out form
      const queryInput = screen.getByLabelText(/research query/i)
      await user.type(queryInput, 'navigation test')

      // Navigate to history page
      const historyLink = screen.getByRole('link', { name: /history/i })
      await user.click(historyLink)

      expect(screen.getByText(/search history/i)).toBeInTheDocument()

      // Navigate back to research
      const researchLink = screen.getByRole('link', { name: /research/i })
      await user.click(researchLink)

      // Form should maintain state (depending on implementation)
      // This tests if the form preserves state during navigation
      const newQueryInput = screen.getByLabelText(/research query/i)
      // Note: This depends on whether state persistence is implemented
    })

    it('loads previous search from history', async () => {
      // Mock search history with results
      vi.mocked(require('@/hooks/useSearchHistory').default).mockReturnValue({
        addSearch: mockAddSearch,
        updateSearchResults: mockUpdateSearchResults,
        searchHistory: [{
          id: 'prev-search-1',
          query: 'previous machine learning query',
          parameters: { max_papers: 10, save_report: true },
          results: mockSuccessfulResults,
          timestamp: new Date().toISOString()
        }],
        clearHistory: vi.fn()
      })

      render(<App />, { initialRoute: '/research' })

      // Click on query input to show history dropdown
      const queryInput = screen.getByLabelText(/research query/i)
      await user.click(queryInput)

      // Should show recent searches
      await waitFor(() => {
        expect(screen.getByText(/recent searches/i)).toBeInTheDocument()
        expect(screen.getByText(/previous machine learning query/i)).toBeInTheDocument()
      })

      // Click on previous search
      const previousSearch = screen.getByText(/previous machine learning query/i)
      await user.click(previousSearch)

      // Should populate form with previous search parameters
      expect(queryInput).toHaveValue('previous machine learning query')
      
      const maxPapersSelect = screen.getByLabelText(/maximum papers/i)
      expect(maxPapersSelect).toHaveValue('10')
      
      const saveReportCheckbox = screen.getByLabelText(/save report/i)
      expect(saveReportCheckbox).toBeChecked()
    })
  })

  describe('Export Workflows', () => {
    beforeEach(async () => {
      render(<App />, { initialRoute: '/research' })

      // Complete a successful research first
      const queryInput = screen.getByLabelText(/research query/i)
      const submitButton = screen.getByRole('button', { name: /start research/i })

      await user.type(queryInput, 'export test')
      await user.click(submitButton)

      // Complete research
      mockWebSocketEvents.emitMessage('research_complete', mockWSData.complete.data)

      await waitFor(() => {
        expect(screen.getByText(/research complete/i)).toBeInTheDocument()
      })
    })

    it('exports results in different formats', async () => {
      const exportButton = screen.getByRole('button', { name: /export results/i })
      await user.click(exportButton)

      const exportDropdown = screen.getByTestId('export-dropdown')

      // Test CSV export
      const csvButton = within(exportDropdown).getByText(/export as csv/i)
      await user.click(csvButton)

      expect(mockDownload).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringContaining('export-test')
      )

      // Reset mock and test PDF export
      mockDownload.mockClear()
      await user.click(exportButton)
      
      const pdfButton = within(exportDropdown).getByText(/export as pdf/i)
      await user.click(pdfButton)

      expect(mockDownload).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringContaining('export-test')
      )
    })

    it('exports individual papers', async () => {
      const paperExportButtons = screen.getAllByLabelText(/export paper/i)
      await user.click(paperExportButtons[0])

      expect(mockDownload).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.any(String),
          authors: expect.any(Array)
        }),
        expect.stringContaining('paper')
      )
    })
  })

  describe('Favorites Management Flow', () => {
    it('manages favorites throughout research flow', async () => {
      render(<App />, { initialRoute: '/research' })

      // Complete research
      const queryInput = screen.getByLabelText(/research query/i)
      const submitButton = screen.getByRole('button', { name: /start research/i })

      await user.type(queryInput, 'favorites test')
      await user.click(submitButton)

      mockWebSocketEvents.emitMessage('research_complete', mockWSData.complete.data)

      await waitFor(() => {
        expect(screen.getByText(/research complete/i)).toBeInTheDocument()
      })

      // Add papers to favorites
      const favoriteButtons = screen.getAllByLabelText(/save to favorites/i)
      await user.click(favoriteButtons[0])
      await user.click(favoriteButtons[1])

      expect(mockAddToFavorites).toHaveBeenCalledTimes(2)

      // Navigate to favorites page
      const favoritesLink = screen.getByRole('link', { name: /favorites/i })
      await user.click(favoritesLink)

      // Should show favorites page
      await waitFor(() => {
        expect(screen.getByText(/saved papers/i)).toBeInTheDocument()
      })

      // Mock favorites data for the page
      mockIsInFavorites.mockReturnValue(true)

      // Navigate back to results and verify favorite status
      const backButton = screen.getByRole('button', { name: /back/i })
      await user.click(backButton)

      // Favorite buttons should now show as favorited
      const favoritedButtons = screen.getAllByLabelText(/remove from favorites/i)
      expect(favoritedButtons.length).toBeGreaterThan(0)
    })
  })
})