import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render, mockWebSocketEvents } from '@/test/utils'
import ResearchPage from '@/pages/ResearchPage'
import ProgressTracker from '@/components/ProgressTracker'
import MobileBottomNav from '@/components/MobileBottomNav'
import { mockWebSocketEvents as mockWSData } from '@/test/mocks/data'

describe('Screen Reader Compatibility Tests', () => {
  beforeEach(() => {
    mockWebSocketEvents.reset()
    vi.clearAllMocks()
  })

  describe('NVDA Screen Reader Support', () => {
    it('provides proper heading navigation structure', () => {
      render(<ResearchPage />)

      const headings = screen.getAllByRole('heading')
      
      // Should have h1 as main page heading
      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toBeInTheDocument()
      expect(h1.textContent).toContain('Research')

      // Headings should be in logical order for navigation
      let previousLevel = 0
      headings.forEach(heading => {
        const level = parseInt(heading.tagName.substring(1))
        if (previousLevel > 0) {
          // Should not skip heading levels
          expect(level).toBeLessThanOrEqual(previousLevel + 1)
        }
        previousLevel = level
      })
    })

    it('provides descriptive form labels for NVDA forms mode', () => {
      render(<ResearchPage />)

      // Query input should have comprehensive labeling
      const queryInput = screen.getByLabelText(/research query/i)
      expect(queryInput).toHaveAttribute('aria-label')
      expect(queryInput).toHaveAttribute('aria-describedby')
      
      const description = document.getElementById(queryInput.getAttribute('aria-describedby')!)
      expect(description).toBeInTheDocument()
      expect(description!.textContent).toContain('Enter your research topic')

      // Select should have proper labeling
      const maxPapersSelect = screen.getByLabelText(/maximum papers/i)
      expect(maxPapersSelect).toHaveAttribute('aria-label')
      
      // Checkbox should have clear purpose
      const saveCheckbox = screen.getByLabelText(/save report/i)
      expect(saveCheckbox).toHaveAttribute('aria-describedby')
    })

    it('announces dynamic content changes properly', async () => {
      render(<ResearchPage />)

      const queryInput = screen.getByLabelText(/research query/i)
      fireEvent.change(queryInput, { target: { value: 'nvda test' } })
      fireEvent.click(screen.getByRole('button', { name: /start research/i }))

      // Should have live region for status updates
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')

      // Simulate progress update
      mockWebSocketEvents.emitMessage('progress_update', {
        stage: 'research',
        progress: 30,
        message: 'Searching academic databases...'
      })

      await waitFor(() => {
        expect(liveRegion).toHaveTextContent(/searching academic databases/i)
      })

      // Error announcements should be assertive
      mockWebSocketEvents.emitMessage('research_error', {
        stage: 'research',
        error_message: 'Network timeout',
        error_code: 'TIMEOUT'
      })

      await waitFor(() => {
        const alertRegion = screen.getByRole('alert')
        expect(alertRegion).toHaveAttribute('aria-live', 'assertive')
        expect(alertRegion).toHaveTextContent(/network timeout/i)
      })
    })

    it('provides table navigation for results (if applicable)', async () => {
      render(<ResearchPage />)

      const queryInput = screen.getByLabelText(/research query/i)
      fireEvent.change(queryInput, { target: { value: 'table test' } })
      fireEvent.click(screen.getByRole('button', { name: /start research/i }))

      mockWebSocketEvents.emitMessage('research_complete', mockWSData.complete.data)

      await waitFor(() => {
        expect(screen.getByText(/research complete/i)).toBeInTheDocument()
      })

      // If results are in table format, should have proper headers
      const tables = screen.queryAllByRole('table')
      tables.forEach(table => {
        const headers = screen.getAllByRole('columnheader')
        expect(headers.length).toBeGreaterThan(0)
        
        headers.forEach(header => {
          expect(header.textContent).toBeTruthy()
        })
      })
    })
  })

  describe('JAWS Screen Reader Support', () => {
    it('provides landmark navigation', () => {
      render(<ResearchPage />)

      // Should have proper landmarks for JAWS navigation
      expect(screen.getByRole('main')).toBeInTheDocument()
      expect(screen.getByRole('banner')).toBeInTheDocument()
      expect(screen.getByRole('navigation')).toBeInTheDocument()
      
      // Main content should be clearly identified
      const main = screen.getByRole('main')
      expect(main).toHaveAttribute('id', 'main-content')
    })

    it('provides comprehensive button descriptions', () => {
      render(<ResearchPage />)

      const submitButton = screen.getByRole('button', { name: /start research/i })
      expect(submitButton).toHaveAttribute('aria-describedby')
      
      const description = document.getElementById(submitButton.getAttribute('aria-describedby')!)
      expect(description).toBeInTheDocument()
      expect(description!.textContent).toContain('Begin analyzing research papers')
    })

    it('handles form validation announcements', async () => {
      const user = userEvent.setup()
      render(<ResearchPage />)

      // Submit empty form
      const submitButton = screen.getByRole('button', { name: /start research/i })
      await user.click(submitButton)

      // Should announce validation errors
      const queryInput = screen.getByLabelText(/research query/i)
      expect(queryInput).toHaveAttribute('aria-invalid', 'true')
      expect(queryInput).toHaveAttribute('aria-describedby')
      
      const errorId = queryInput.getAttribute('aria-describedby')
      const errorMessage = document.getElementById(errorId!)
      expect(errorMessage).toHaveAttribute('role', 'alert')
    })

    it('provides progress bar semantics', () => {
      render(
        <ProgressTracker
          isActive={true}
          onCancel={vi.fn()}
          onComplete={vi.fn()}
          onError={vi.fn()}
          query="jaws test"
        />
      )

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-label', 'Research progress')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
      expect(progressBar).toHaveAttribute('aria-valuenow', '0')
      expect(progressBar).toHaveAttribute('aria-valuetext', 'Research starting')
    })
  })

  describe('VoiceOver Screen Reader Support', () => {
    it('provides rotor navigation elements', () => {
      render(<ResearchPage />)

      // Headings for rotor navigation
      const headings = screen.getAllByRole('heading')
      expect(headings.length).toBeGreaterThan(1)
      
      headings.forEach(heading => {
        expect(heading.textContent).toBeTruthy()
        expect(heading.textContent!.length).toBeGreaterThan(2)
      })

      // Links for rotor navigation
      const links = screen.getAllByRole('link')
      links.forEach(link => {
        const accessibleName = link.getAttribute('aria-label') || link.textContent
        expect(accessibleName).toBeTruthy()
      })

      // Form controls for rotor navigation
      const formControls = [
        ...screen.getAllByRole('textbox'),
        ...screen.getAllByRole('combobox'),
        ...screen.getAllByRole('checkbox'),
        ...screen.getAllByRole('button')
      ]
      
      formControls.forEach(control => {
        const label = control.getAttribute('aria-label') || 
                     control.getAttribute('aria-labelledby') ||
                     document.querySelector(`label[for="${control.id}"]`)?.textContent
        expect(label).toBeTruthy()
      })
    })

    it('handles touch screen reader gestures', () => {
      render(<MobileBottomNav />)

      const navButtons = screen.getAllByRole('link')
      
      navButtons.forEach(button => {
        // Should have proper touch target size for VoiceOver
        const styles = getComputedStyle(button)
        expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44)
        expect(parseInt(styles.minWidth)).toBeGreaterThanOrEqual(44)
        
        // Should have descriptive labels
        expect(button).toHaveAttribute('aria-label')
      })
    })

    it('provides contextual help text', () => {
      render(<ResearchPage />)

      const queryInput = screen.getByLabelText(/research query/i)
      const helpTextId = queryInput.getAttribute('aria-describedby')
      
      if (helpTextId) {
        const helpText = document.getElementById(helpTextId)
        expect(helpText).toBeInTheDocument()
        expect(helpText!.textContent).toContain('Enter keywords describing your research area')
      }

      const maxPapersSelect = screen.getByLabelText(/maximum papers/i)
      const selectHelpId = maxPapersSelect.getAttribute('aria-describedby')
      
      if (selectHelpId) {
        const selectHelp = document.getElementById(selectHelpId)
        expect(selectHelp).toBeInTheDocument()
        expect(selectHelp!.textContent).toContain('Choose how many papers to analyze')
      }
    })
  })

  describe('Dragon NaturallySpeaking Voice Control', () => {
    it('provides unique accessible names for voice commands', () => {
      render(<ResearchPage />)

      const buttons = screen.getAllByRole('button')
      const buttonNames = buttons.map(button => 
        button.getAttribute('aria-label') || button.textContent
      )

      // All button names should be unique for voice commands
      const uniqueNames = new Set(buttonNames)
      expect(uniqueNames.size).toBe(buttonNames.length)
    })

    it('includes visible text in accessible names', () => {
      render(<ResearchPage />)

      const buttons = screen.getAllByRole('button')
      
      buttons.forEach(button => {
        const visibleText = button.textContent?.trim()
        const accessibleName = button.getAttribute('aria-label')
        
        if (visibleText && accessibleName) {
          // Accessible name should include visible text for voice commands
          expect(accessibleName.toLowerCase()).toContain(visibleText.toLowerCase())
        }
      })
    })

    it('provides clickable elements with clear names', async () => {
      render(<ResearchPage />)

      const queryInput = screen.getByLabelText(/research query/i)
      fireEvent.change(queryInput, { target: { value: 'voice test' } })
      fireEvent.click(screen.getByRole('button', { name: /start research/i }))

      mockWebSocketEvents.emitMessage('research_complete', mockWSData.complete.data)

      await waitFor(() => {
        expect(screen.getByText(/research complete/i)).toBeInTheDocument()
      })

      // All clickable elements should have unambiguous names
      const clickableElements = [
        ...screen.getAllByRole('button'),
        ...screen.getAllByRole('link'),
        ...screen.getAllByRole('checkbox')
      ]

      clickableElements.forEach(element => {
        const name = element.getAttribute('aria-label') || element.textContent
        expect(name).toBeTruthy()
        expect(name!.length).toBeGreaterThan(2)
      })
    })
  })

  describe('High Contrast Mode Support', () => {
    it('maintains functionality in high contrast mode', () => {
      // Simulate high contrast mode
      document.body.style.filter = 'contrast(200%)'
      
      render(<ResearchPage />)

      // Elements should still be functional
      expect(screen.getByLabelText(/research query/i)).toBeVisible()
      expect(screen.getByRole('button', { name: /start research/i })).toBeVisible()

      // Reset
      document.body.style.filter = ''
    })

    it('uses system colors appropriately', () => {
      render(<ResearchPage />)

      const buttons = screen.getAllByRole('button')
      
      buttons.forEach(button => {
        const styles = getComputedStyle(button)
        
        // Should not rely solely on custom colors
        expect(styles.borderStyle).not.toBe('none')
      })
    })
  })

  describe('Magnification Software Support', () => {
    it('maintains layout at high zoom levels', () => {
      // Simulate 200% zoom
      document.documentElement.style.fontSize = '32px'
      document.documentElement.style.zoom = '2'
      
      render(<ResearchPage />)

      // Content should still be accessible
      expect(screen.getByLabelText(/research query/i)).toBeVisible()
      expect(screen.getByRole('button', { name: /start research/i })).toBeVisible()

      // Reset
      document.documentElement.style.fontSize = ''
      document.documentElement.style.zoom = ''
    })

    it('maintains focus visibility at high magnification', () => {
      render(<ResearchPage />)

      const focusableElements = screen.getAllByRole('button')
      
      focusableElements.forEach(element => {
        // Focus indicators should be substantial enough to be visible when magnified
        expect(element).toHaveClass('focus:ring-2')
        
        const styles = getComputedStyle(element)
        if (element.matches(':focus')) {
          expect(styles.outline !== 'none' || styles.boxShadow !== 'none').toBe(true)
        }
      })
    })
  })

  describe('Switch Navigation Support', () => {
    it('supports sequential switch navigation', async () => {
      const user = userEvent.setup()
      render(<ResearchPage />)

      // Should be able to navigate with single switch (tab)
      const focusableElements = [
        screen.getByLabelText(/research query/i),
        screen.getByLabelText(/maximum papers/i),
        screen.getByLabelText(/save report/i),
        screen.getByRole('button', { name: /start research/i })
      ]

      for (const element of focusableElements) {
        await user.tab()
        expect(element).toHaveFocus()
      }
    })

    it('provides activation alternatives for complex gestures', () => {
      render(<ResearchPage />)

      // Complete research to check for any complex interactions
      const queryInput = screen.getByLabelText(/research query/i)
      fireEvent.change(queryInput, { target: { value: 'switch test' } })
      fireEvent.click(screen.getByRole('button', { name: /start research/i }))

      mockWebSocketEvents.emitMessage('research_complete', mockWSData.complete.data)

      // Any swipe or complex gestures should have button alternatives
      const actionButtons = screen.getAllByRole('button')
      expect(actionButtons.length).toBeGreaterThan(0)
      
      // Each action should be achievable through simple activation
      actionButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label')
      })
    })
  })

  describe('Cognitive Accessibility Support', () => {
    it('provides clear error messages and recovery instructions', async () => {
      const user = userEvent.setup()
      render(<ResearchPage />)

      // Trigger error
      const submitButton = screen.getByRole('button', { name: /start research/i })
      await user.click(submitButton)

      // Error message should be clear and actionable
      const errorMessage = screen.queryByRole('alert')
      if (errorMessage) {
        expect(errorMessage.textContent).toContain('required')
        expect(errorMessage.textContent).toContain('Enter')
      }
    })

    it('provides consistent navigation and layout', () => {
      render(<ResearchPage />)

      // Navigation should be predictable
      const navigation = screen.getByRole('navigation')
      expect(navigation).toBeInTheDocument()

      // Form layout should be logical
      const formElements = [
        screen.getByLabelText(/research query/i),
        screen.getByLabelText(/maximum papers/i),
        screen.getByLabelText(/save report/i),
        screen.getByRole('button', { name: /start research/i })
      ]

      // Elements should appear in logical tab order
      let previousTabIndex = -1
      formElements.forEach(element => {
        const tabIndex = parseInt(element.getAttribute('tabindex') || '0')
        expect(tabIndex).toBeGreaterThanOrEqual(previousTabIndex)
        previousTabIndex = tabIndex
      })
    })

    it('provides timeout warnings and extensions', () => {
      render(<ResearchPage />)

      // If timeouts exist, should warn user
      const timeoutElements = document.querySelectorAll('[data-timeout]')
      timeoutElements.forEach(element => {
        const warningId = element.getAttribute('aria-describedby')
        if (warningId) {
          const warning = document.getElementById(warningId)
          expect(warning!.textContent).toContain('timeout')
        }
      })
    })
  })
})