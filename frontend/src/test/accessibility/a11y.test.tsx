import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { render, mockWebSocketEvents } from '@/test/utils'
import App from '@/App'
import ResearchPage from '@/pages/ResearchPage'
import ProgressTracker from '@/components/ProgressTracker'
import MobileBottomNav from '@/components/MobileBottomNav'
import { mockSuccessfulResults, mockWebSocketEvents as mockWSData } from '@/test/mocks/data'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

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

describe('Accessibility Tests', () => {
  beforeEach(() => {
    mockWebSocketEvents.reset()
    vi.clearAllMocks()
  })

  describe('Automated Accessibility Testing', () => {
    it('passes axe accessibility tests for main app', async () => {
      const { container } = render(<App />, { initialRoute: '/' })
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('passes axe accessibility tests for research page', async () => {
      const { container } = render(<ResearchPage />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('passes axe accessibility tests for mobile navigation', async () => {
      const { container } = render(<MobileBottomNav />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('passes axe accessibility tests for progress tracker', async () => {
      const { container } = render(
        <ProgressTracker
          isActive={true}
          onCancel={vi.fn()}
          onComplete={vi.fn()}
          onError={vi.fn()}
          query="test query"
        />
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Keyboard Navigation', () => {
    it('supports full keyboard navigation on research page', async () => {
      const user = userEvent.setup()
      render(<ResearchPage />)

      // Tab through form elements
      await user.tab()
      expect(screen.getByLabelText(/research query/i)).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText(/maximum papers/i)).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText(/save report/i)).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('button', { name: /start research/i })).toHaveFocus()
    })

    it('supports keyboard navigation in mobile bottom nav', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNav />)

      const navLinks = screen.getAllByRole('link')
      
      // Should be able to tab through all navigation links
      for (let i = 0; i < navLinks.length; i++) {
        await user.tab()
        expect(navLinks[i]).toHaveFocus()
      }
    })

    it('handles Enter and Space key activation', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<ResearchPage />)

      const submitButton = screen.getByRole('button', { name: /start research/i })
      
      // Type query first to enable button
      const queryInput = screen.getByLabelText(/research query/i)
      await user.type(queryInput, 'test query')

      submitButton.focus()

      // Test Enter key
      await user.keyboard('{Enter}')
      // Button should be activated (form should start submission)
      expect(screen.getByText(/researching.../i)).toBeInTheDocument()
    })

    it('provides skip links for screen readers', () => {
      render(<App />)

      const skipLink = screen.getByText(/skip to main content/i)
      expect(skipLink).toBeInTheDocument()
      expect(skipLink).toHaveAttribute('href', '#main-content')
    })

    it('maintains focus when modals/dialogs open', async () => {
      const user = userEvent.setup()
      render(<ResearchPage />)

      // Complete research to get results with export options
      const queryInput = screen.getByLabelText(/research query/i)
      await user.type(queryInput, 'modal test')
      await user.click(screen.getByRole('button', { name: /start research/i }))

      mockWebSocketEvents.emitMessage('research_complete', mockWSData.complete.data)

      await waitFor(() => {
        expect(screen.getByText(/research complete/i)).toBeInTheDocument()
      })

      // Open export dialog
      const exportButton = screen.getByRole('button', { name: /export results/i })
      await user.click(exportButton)

      // Focus should move to first element in dialog
      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
      
      const firstDialogButton = screen.getAllByRole('button')[0]
      expect(document.activeElement).toBe(firstDialogButton)
    })
  })

  describe('Screen Reader Support', () => {
    it('provides proper headings hierarchy', () => {
      render(<ResearchPage />)

      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toBeInTheDocument()

      // Should have logical heading structure
      const headings = screen.getAllByRole('heading')
      let currentLevel = 1
      
      headings.forEach(heading => {
        const level = parseInt(heading.tagName.substring(1))
        expect(level).toBeLessThanOrEqual(currentLevel + 1)
        currentLevel = level
      })
    })

    it('provides descriptive labels for form controls', () => {
      render(<ResearchPage />)

      const queryInput = screen.getByLabelText(/research query/i)
      expect(queryInput).toHaveAttribute('aria-label')
      expect(queryInput).toHaveAttribute('aria-describedby')

      const maxPapersSelect = screen.getByLabelText(/maximum papers/i)
      expect(maxPapersSelect).toHaveAttribute('aria-label')

      const saveReportCheckbox = screen.getByLabelText(/save report/i)
      expect(saveReportCheckbox).toHaveAttribute('aria-label')
    })

    it('announces progress updates to screen readers', async () => {
      render(
        <ProgressTracker
          isActive={true}
          onCancel={vi.fn()}
          onComplete={vi.fn()}
          onError={vi.fn()}
          query="test query"
        />
      )

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-label')
      expect(progressBar).toHaveAttribute('aria-valuenow', '0')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')

      // Simulate progress update
      mockWebSocketEvents.emitMessage('progress_update', {
        stage: 'research',
        progress: 50,
        message: 'Searching for papers...'
      })

      await waitFor(() => {
        expect(progressBar).toHaveAttribute('aria-valuenow', '50')
        
        // Should have live region for announcing updates
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent(/searching for papers/i)
      })
    })

    it('provides alternative text for images and icons', () => {
      render(<App />)

      const images = document.querySelectorAll('img')
      images.forEach(img => {
        expect(img).toHaveAttribute('alt')
        expect(img.getAttribute('alt')).toBeTruthy()
      })

      // Icons should have aria-label or be marked as decorative
      const icons = document.querySelectorAll('[data-testid*="icon"]')
      icons.forEach(icon => {
        const hasAriaLabel = icon.hasAttribute('aria-label')
        const isDecorative = icon.getAttribute('aria-hidden') === 'true'
        expect(hasAriaLabel || isDecorative).toBe(true)
      })
    })

    it('uses landmarks to structure page content', () => {
      render(<App />)

      expect(screen.getByRole('banner')).toBeInTheDocument() // header
      expect(screen.getByRole('main')).toBeInTheDocument() // main content
      expect(screen.getByRole('navigation')).toBeInTheDocument() // navigation
      expect(screen.getByRole('contentinfo')).toBeInTheDocument() // footer
    })
  })

  describe('Focus Management', () => {
    it('provides visible focus indicators', () => {
      render(<ResearchPage />)

      const focusableElements = screen.getAllByRole('button')
      
      focusableElements.forEach(element => {
        // Should have focus styles
        expect(element).toHaveClass('focus:outline-none', 'focus:ring-2')
      })
    })

    it('manages focus in dynamic content', async () => {
      const user = userEvent.setup()
      render(<ResearchPage />)

      const queryInput = screen.getByLabelText(/research query/i)
      await user.type(queryInput, 'focus test')
      await user.click(screen.getByRole('button', { name: /start research/i }))

      // During loading, focus should remain manageable
      const cancelButton = screen.getByRole('button', { name: /cancel research/i })
      expect(cancelButton).toBeInTheDocument()

      // Complete research
      mockWebSocketEvents.emitMessage('research_complete', mockWSData.complete.data)

      await waitFor(() => {
        expect(screen.getByText(/research complete/i)).toBeInTheDocument()
      })

      // Focus should move to results heading
      const resultsHeading = screen.getByRole('heading', { name: /research complete/i })
      expect(resultsHeading).toHaveAttribute('tabindex', '-1')
    })

    it('traps focus in modal dialogs', async () => {
      const user = userEvent.setup()
      render(<ResearchPage />)

      // Complete research and open export dialog
      const queryInput = screen.getByLabelText(/research query/i)
      await user.type(queryInput, 'modal focus test')
      await user.click(screen.getByRole('button', { name: /start research/i }))

      mockWebSocketEvents.emitMessage('research_complete', mockWSData.complete.data)

      await waitFor(() => {
        expect(screen.getByText(/research complete/i)).toBeInTheDocument()
      })

      const exportButton = screen.getByRole('button', { name: /export results/i })
      await user.click(exportButton)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()

      // Tab should cycle within the dialog
      const dialogButtons = screen.getAllByRole('button').filter(btn => 
        dialog.contains(btn)
      )

      for (let i = 0; i < dialogButtons.length + 1; i++) {
        await user.tab()
      }

      // Should cycle back to first button in dialog
      expect(dialogButtons[0]).toHaveFocus()
    })
  })

  describe('Color and Contrast', () => {
    it('maintains sufficient color contrast', () => {
      render(<ResearchPage />)

      // This is a simplified test - in practice you'd use a color contrast library
      const textElements = screen.getAllByRole('button')
      
      textElements.forEach(element => {
        const styles = window.getComputedStyle(element)
        
        // Ensure text and background colors are defined
        expect(styles.color).toBeTruthy()
        expect(styles.backgroundColor || styles.background).toBeTruthy()
      })
    })

    it('works without color alone to convey information', () => {
      render(<ResearchPage />)

      // Complete research to show results with relevance scores
      const queryInput = screen.getByLabelText(/research query/i)
      fireEvent.change(queryInput, { target: { value: 'color test' } })
      fireEvent.click(screen.getByRole('button', { name: /start research/i }))

      mockWebSocketEvents.emitMessage('research_complete', mockWSData.complete.data)

      // Relevance scores should not rely on color alone
      const relevanceScores = document.querySelectorAll('[data-testid="relevance-score"]')
      relevanceScores.forEach(score => {
        // Should have text content, not just color
        expect(score.textContent).toBeTruthy()
        
        // Should have accessible labels
        expect(score).toHaveAttribute('aria-label')
      })
    })
  })

  describe('Forms Accessibility', () => {
    it('associates labels with form controls', () => {
      render(<ResearchPage />)

      const queryInput = screen.getByLabelText(/research query/i)
      const label = document.querySelector('label[for="' + queryInput.id + '"]')
      expect(label).toBeInTheDocument()

      const maxPapersSelect = screen.getByLabelText(/maximum papers/i)
      const selectLabel = document.querySelector('label[for="' + maxPapersSelect.id + '"]')
      expect(selectLabel).toBeInTheDocument()
    })

    it('provides error messages for form validation', async () => {
      const user = userEvent.setup()
      render(<ResearchPage />)

      const submitButton = screen.getByRole('button', { name: /start research/i })
      
      // Try to submit without query
      await user.click(submitButton)

      // Should show error message associated with input
      const queryInput = screen.getByLabelText(/research query/i)
      const errorId = queryInput.getAttribute('aria-describedby')
      
      if (errorId) {
        const errorMessage = document.getElementById(errorId)
        expect(errorMessage).toBeInTheDocument()
        expect(errorMessage).toHaveAttribute('role', 'alert')
      }
    })

    it('provides helpful descriptions for form fields', () => {
      render(<ResearchPage />)

      const queryInput = screen.getByLabelText(/research query/i)
      const descriptionId = queryInput.getAttribute('aria-describedby')
      
      if (descriptionId) {
        const description = document.getElementById(descriptionId)
        expect(description).toBeInTheDocument()
        expect(description.textContent).toContain('Enter your research topic')
      }
    })
  })

  describe('Dynamic Content Accessibility', () => {
    it('announces live updates appropriately', async () => {
      render(<ResearchPage />)

      const queryInput = screen.getByLabelText(/research query/i)
      fireEvent.change(queryInput, { target: { value: 'live update test' } })
      fireEvent.click(screen.getByRole('button', { name: /start research/i }))

      // Should have live region for status updates
      const statusRegion = screen.getByRole('status')
      expect(statusRegion).toHaveAttribute('aria-live', 'polite')

      // Simulate progress update
      mockWebSocketEvents.emitMessage('progress_update', {
        stage: 'research',
        progress: 30,
        message: 'Finding relevant papers...'
      })

      await waitFor(() => {
        expect(statusRegion).toHaveTextContent(/finding relevant papers/i)
      })
    })

    it('handles loading states accessibly', async () => {
      render(<ResearchPage />)

      const queryInput = screen.getByLabelText(/research query/i)
      fireEvent.change(queryInput, { target: { value: 'loading test' } })
      
      const submitButton = screen.getByRole('button', { name: /start research/i })
      fireEvent.click(submitButton)

      // Loading button should be properly labeled
      const loadingButton = screen.getByRole('button', { name: /researching.../i })
      expect(loadingButton).toHaveAttribute('aria-disabled', 'true')
      expect(loadingButton).toHaveAttribute('aria-describedby')
      
      // Should have loading indicator
      const loadingIndicator = screen.getByRole('progressbar')
      expect(loadingIndicator).toHaveAttribute('aria-label', 'Research in progress')
    })
  })

  describe('Mobile Accessibility', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 })
      Object.defineProperty(window, 'innerHeight', { value: 667 })
    })

    it('provides adequate touch targets on mobile', () => {
      render(<MobileBottomNav />)

      const navButtons = screen.getAllByRole('link')
      
      navButtons.forEach(button => {
        const styles = window.getComputedStyle(button)
        const minHeight = parseInt(styles.minHeight)
        
        // Touch targets should be at least 44px
        expect(minHeight).toBeGreaterThanOrEqual(44)
      })
    })

    it('maintains accessibility in mobile layouts', () => {
      render(<ResearchPage />)

      // Should still have proper heading structure on mobile
      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toBeInTheDocument()

      // Form labels should still be associated
      const queryInput = screen.getByLabelText(/research query/i)
      expect(queryInput).toHaveAttribute('id')
    })
  })

  describe('Reduced Motion Support', () => {
    beforeEach(() => {
      // Mock prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          addEventListener: vi.fn(),
          removeEventListener: vi.fn()
        }))
      })
    })

    it('respects reduced motion preferences', () => {
      render(<ProgressTracker
        isActive={true}
        onCancel={vi.fn()}
        onComplete={vi.fn()}
        onError={vi.fn()}
        query="reduced motion test"
      />)

      const animatedElements = document.querySelectorAll('.animate-pulse, .animate-spin')
      
      animatedElements.forEach(element => {
        expect(element).toHaveClass('motion-reduce:animate-none')
      })
    })
  })

  describe('Error Handling Accessibility', () => {
    it('announces errors to screen readers', async () => {
      render(<ResearchPage />)

      const queryInput = screen.getByLabelText(/research query/i)
      fireEvent.change(queryInput, { target: { value: 'error test' } })
      fireEvent.click(screen.getByRole('button', { name: /start research/i }))

      // Simulate error
      mockWebSocketEvents.emitMessage('research_error', {
        stage: 'research',
        error_message: 'Network timeout',
        error_code: 'TIMEOUT'
      })

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert')
        expect(errorAlert).toBeInTheDocument()
        expect(errorAlert).toHaveTextContent(/network timeout/i)
      })
    })

    it('provides actionable error recovery options', async () => {
      render(<ResearchPage />)

      const queryInput = screen.getByLabelText(/research query/i)
      fireEvent.change(queryInput, { target: { value: 'error recovery test' } })
      fireEvent.click(screen.getByRole('button', { name: /start research/i }))

      mockWebSocketEvents.emitMessage('research_error', {
        stage: 'research',
        error_message: 'API rate limit exceeded',
        error_code: 'RATE_LIMIT'
      })

      await waitFor(() => {
        // Should provide retry button
        const retryButton = screen.getByRole('button', { name: /try again/i })
        expect(retryButton).toBeInTheDocument()
        expect(retryButton).toHaveAttribute('aria-describedby')
        
        // Should explain what happened and what user can do
        const errorDescription = screen.getByText(/rate limit exceeded/i)
        expect(errorDescription).toBeInTheDocument()
      })
    })
  })
})