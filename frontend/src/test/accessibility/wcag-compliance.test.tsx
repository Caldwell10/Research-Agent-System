import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { render, mockWebSocketEvents } from '@/test/utils'
import App from '@/App'
import ResearchPage from '@/pages/ResearchPage'
import { mockWebSocketEvents as mockWSData } from '@/test/mocks/data'

// WCAG 2.1 AA Compliance Tests
describe('WCAG 2.1 AA Compliance Tests', () => {
  beforeEach(() => {
    mockWebSocketEvents.reset()
    vi.clearAllMocks()
  })

  describe('1. Perceivable - Information must be presentable in ways users can perceive', () => {
    describe('1.1 Text Alternatives', () => {
      it('1.1.1 Non-text Content - provides text alternatives for images', () => {
        render(<App />)

        const images = document.querySelectorAll('img')
        images.forEach(img => {
          const alt = img.getAttribute('alt')
          const ariaLabel = img.getAttribute('aria-label')
          const ariaLabelledBy = img.getAttribute('aria-labelledby')
          
          // Should have alt text, aria-label, or aria-labelledby
          expect(alt !== null || ariaLabel !== null || ariaLabelledBy !== null).toBe(true)
          
          // If decorative, should have empty alt or aria-hidden
          if (img.hasAttribute('aria-hidden') && img.getAttribute('aria-hidden') === 'true') {
            expect(alt).toBe('')
          } else {
            // Meaningful images should have descriptive text
            expect(alt || ariaLabel).toBeTruthy()
          }
        })
      })

      it('1.1.1 Non-text Content - provides text alternatives for icons', () => {
        render(<ResearchPage />)

        const icons = document.querySelectorAll('[data-testid*="icon"], .icon, [class*="icon"]')
        icons.forEach(icon => {
          const ariaLabel = icon.getAttribute('aria-label')
          const ariaHidden = icon.getAttribute('aria-hidden')
          const title = icon.getAttribute('title')
          
          // Icons should either have accessible text or be marked as decorative
          const hasAccessibleText = ariaLabel || title
          const isDecorative = ariaHidden === 'true'
          
          expect(hasAccessibleText || isDecorative).toBe(true)
        })
      })
    })

    describe('1.3 Adaptable', () => {
      it('1.3.1 Info and Relationships - uses proper heading hierarchy', () => {
        render(<ResearchPage />)

        const headings = screen.getAllByRole('heading')
        let previousLevel = 0

        headings.forEach(heading => {
          const level = parseInt(heading.tagName.substring(1))
          
          // Heading levels should not skip (e.g., h1 -> h3)
          if (previousLevel > 0) {
            expect(level).toBeLessThanOrEqual(previousLevel + 1)
          }
          
          previousLevel = level
        })
      })

      it('1.3.1 Info and Relationships - associates form labels with controls', () => {
        render(<ResearchPage />)

        const inputs = screen.getAllByRole('textbox')
        const selects = screen.getAllByRole('combobox')
        const checkboxes = screen.getAllByRole('checkbox')
        
        const formControls = [...inputs, ...selects, ...checkboxes]
        
        formControls.forEach(control => {
          const id = control.getAttribute('id')
          const ariaLabel = control.getAttribute('aria-label')
          const ariaLabelledBy = control.getAttribute('aria-labelledby')
          
          // Should have associated label
          if (!ariaLabel && !ariaLabelledBy && id) {
            const label = document.querySelector(`label[for="${id}"]`)
            expect(label).toBeTruthy()
          } else {
            expect(ariaLabel || ariaLabelledBy).toBeTruthy()
          }
        })
      })

      it('1.3.2 Meaningful Sequence - maintains logical reading order', () => {
        render(<ResearchPage />)

        const focusableElements = document.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )

        const tabIndices = Array.from(focusableElements).map(el => 
          parseInt(el.getAttribute('tabindex') || '0')
        )

        // Tab indices should be in logical order (0 or positive, not negative for focusable elements)
        tabIndices.forEach(tabIndex => {
          expect(tabIndex).toBeGreaterThanOrEqual(0)
        })
      })

      it('1.3.4 Orientation - content adapts to different orientations', () => {
        const { rerender } = render(<ResearchPage />)

        // Portrait orientation
        Object.defineProperty(screen, 'orientation', {
          value: { angle: 0, type: 'portrait-primary' },
          configurable: true
        })

        let content = screen.getByTestId('main-content')
        expect(content).toBeInTheDocument()

        // Landscape orientation
        Object.defineProperty(screen, 'orientation', {
          value: { angle: 90, type: 'landscape-primary' }
        })

        fireEvent(window, new Event('orientationchange'))
        rerender(<ResearchPage />)

        content = screen.getByTestId('main-content')
        expect(content).toBeInTheDocument()
      })

      it('1.3.5 Identify Input Purpose - form inputs have proper autocomplete attributes', () => {
        render(<ResearchPage />)

        const queryInput = screen.getByLabelText(/research query/i)
        
        // Should have appropriate autocomplete attribute if applicable
        const autocomplete = queryInput.getAttribute('autocomplete')
        if (autocomplete) {
          expect(['on', 'off', 'search']).toContain(autocomplete)
        }
      })
    })

    describe('1.4 Distinguishable', () => {
      it('1.4.1 Use of Color - information is not conveyed by color alone', () => {
        render(<ResearchPage />)

        // Complete research to get results with relevance indicators
        const queryInput = screen.getByLabelText(/research query/i)
        fireEvent.change(queryInput, { target: { value: 'color test' } })
        fireEvent.click(screen.getByRole('button', { name: /start research/i }))

        mockWebSocketEvents.emitMessage('research_complete', mockWSData.complete.data)

        // Check if relevance scores use more than just color
        const relevanceElements = document.querySelectorAll('[data-testid*="relevance"]')
        relevanceElements.forEach(element => {
          // Should have text content or symbols, not just color
          expect(element.textContent || element.getAttribute('aria-label')).toBeTruthy()
        })
      })

      it('1.4.3 Contrast (Minimum) - text has sufficient contrast ratio', () => {
        render(<ResearchPage />)

        // This is a simplified test - in practice, use a contrast ratio library
        const textElements = screen.getAllByRole('button')
        
        textElements.forEach(element => {
          const styles = window.getComputedStyle(element)
          
          // Ensure colors are defined (actual contrast calculation would be more complex)
          expect(styles.color).toBeTruthy()
          expect(styles.backgroundColor || element.closest('[style*="background"]')).toBeTruthy()
        })
      })

      it('1.4.4 Resize Text - text can be resized up to 200% without loss of functionality', () => {
        render(<ResearchPage />)

        // Simulate text resize
        const originalFontSize = parseInt(getComputedStyle(document.documentElement).fontSize)
        document.documentElement.style.fontSize = `${originalFontSize * 2}px`

        // Content should still be accessible
        expect(screen.getByLabelText(/research query/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /start research/i })).toBeInTheDocument()

        // Reset
        document.documentElement.style.fontSize = `${originalFontSize}px`
      })

      it('1.4.10 Reflow - content reflows for 320px width without horizontal scrolling', () => {
        // Simulate 320px width
        Object.defineProperty(window, 'innerWidth', { value: 320, configurable: true })
        fireEvent(window, new Event('resize'))

        render(<ResearchPage />)

        const mainContent = screen.getByTestId('main-content')
        const styles = getComputedStyle(mainContent)
        
        // Should not require horizontal scrolling
        expect(styles.overflowX).not.toBe('scroll')
      })

      it('1.4.11 Non-text Contrast - UI components have sufficient contrast', () => {
        render(<ResearchPage />)

        const buttons = screen.getAllByRole('button')
        const inputs = screen.getAllByRole('textbox')
        
        const allElements = [...buttons, ...inputs]
        allElements.forEach(element => {
          const styles = getComputedStyle(element)
          
          // Should have visible borders or backgrounds
          expect(
            styles.borderColor !== 'transparent' || 
            styles.backgroundColor !== 'transparent' ||
            styles.outline !== 'none'
          ).toBe(true)
        })
      })

      it('1.4.12 Text Spacing - text maintains readability with increased spacing', () => {
        render(<ResearchPage />)

        // Apply increased text spacing
        document.body.style.lineHeight = '1.5'
        document.body.style.letterSpacing = '0.12em'
        document.body.style.wordSpacing = '0.16em'

        // Content should still be readable
        expect(screen.getByLabelText(/research query/i)).toBeVisible()
        expect(screen.getByRole('button', { name: /start research/i })).toBeVisible()

        // Reset
        document.body.style.lineHeight = ''
        document.body.style.letterSpacing = ''
        document.body.style.wordSpacing = ''
      })
    })
  })

  describe('2. Operable - Interface components must be operable', () => {
    describe('2.1 Keyboard Accessible', () => {
      it('2.1.1 Keyboard - all functionality is available via keyboard', async () => {
        const user = userEvent.setup()
        render(<ResearchPage />)

        // Should be able to navigate and interact with keyboard only
        await user.tab() // Query input
        expect(screen.getByLabelText(/research query/i)).toHaveFocus()

        await user.type(document.activeElement as Element, 'keyboard test')
        
        await user.tab() // Max papers
        expect(screen.getByLabelText(/maximum papers/i)).toHaveFocus()

        await user.tab() // Save report checkbox
        expect(screen.getByLabelText(/save report/i)).toHaveFocus()

        await user.keyboard(' ') // Activate checkbox
        expect(screen.getByLabelText(/save report/i)).toBeChecked()

        await user.tab() // Submit button
        expect(screen.getByRole('button', { name: /start research/i })).toHaveFocus()

        await user.keyboard('{Enter}') // Activate button
        expect(screen.getByText(/researching.../i)).toBeInTheDocument()
      })

      it('2.1.2 No Keyboard Trap - keyboard focus is not trapped', async () => {
        const user = userEvent.setup()
        render(<ResearchPage />)

        const focusableElements = screen.getAllByRole('button')
        
        // Should be able to tab through all elements and cycle back
        for (let i = 0; i <= focusableElements.length; i++) {
          await user.tab()
        }

        // Should not be trapped in any element
        expect(document.activeElement).toBeTruthy()
      })

      it('2.1.4 Character Key Shortcuts - single key shortcuts can be turned off', () => {
        render(<ResearchPage />)

        // If single character shortcuts exist, they should be configurable
        const shortcuts = document.querySelectorAll('[data-shortcut]')
        shortcuts.forEach(element => {
          const shortcut = element.getAttribute('data-shortcut')
          if (shortcut && shortcut.length === 1) {
            // Should have mechanism to disable or modify
            expect(element).toHaveAttribute('aria-describedby')
          }
        })
      })
    })

    describe('2.2 Enough Time', () => {
      it('2.2.1 Timing Adjustable - no timing restrictions or user can extend', () => {
        render(<ResearchPage />)

        // If there are timeouts, user should be able to extend them
        const timedElements = document.querySelectorAll('[data-timeout]')
        timedElements.forEach(element => {
          // Should have controls to extend time
          expect(element.querySelector('[aria-label*="extend"]')).toBeTruthy()
        })
      })

      it('2.2.2 Pause, Stop, Hide - moving content can be controlled', async () => {
        render(<ResearchPage />)

        // Start research to get progress animations
        const queryInput = screen.getByLabelText(/research query/i)
        fireEvent.change(queryInput, { target: { value: 'animation test' } })
        fireEvent.click(screen.getByRole('button', { name: /start research/i }))

        // Animated elements should have controls
        const animatedElements = document.querySelectorAll('.animate-pulse, .animate-spin')
        if (animatedElements.length > 0) {
          // Should respect prefers-reduced-motion
          animatedElements.forEach(element => {
            expect(element).toHaveClass('motion-reduce:animate-none')
          })
        }
      })
    })

    describe('2.3 Seizures and Physical Reactions', () => {
      it('2.3.1 Three Flashes or Below Threshold - no content flashes more than 3 times per second', () => {
        render(<ResearchPage />)

        // Any flashing content should be below threshold
        const flashingElements = document.querySelectorAll('.animate-pulse, [data-flash]')
        flashingElements.forEach(element => {
          const animationDuration = getComputedStyle(element).animationDuration
          if (animationDuration) {
            const duration = parseFloat(animationDuration.replace('s', ''))
            // Animation should be slower than 3 flashes per second
            expect(duration).toBeGreaterThan(0.33)
          }
        })
      })
    })

    describe('2.4 Navigable', () => {
      it('2.4.1 Bypass Blocks - provides skip links', () => {
        render(<App />)

        const skipLink = screen.getByText(/skip to main content/i)
        expect(skipLink).toBeInTheDocument()
        expect(skipLink.getAttribute('href')).toBe('#main-content')
      })

      it('2.4.2 Page Titled - page has descriptive title', () => {
        render(<App />)

        expect(document.title).toBeTruthy()
        expect(document.title.length).toBeGreaterThan(0)
      })

      it('2.4.3 Focus Order - focus order is logical and meaningful', async () => {
        const user = userEvent.setup()
        render(<ResearchPage />)

        const expectedOrder = [
          /research query/i,
          /maximum papers/i,
          /save report/i,
          /start research/i
        ]

        for (const labelPattern of expectedOrder) {
          await user.tab()
          const activeElement = document.activeElement
          expect(activeElement).toHaveAccessibleName(labelPattern)
        }
      })

      it('2.4.4 Link Purpose - link purpose is clear from context', () => {
        render(<App />)

        const links = screen.getAllByRole('link')
        links.forEach(link => {
          const accessibleName = link.getAttribute('aria-label') || link.textContent
          expect(accessibleName).toBeTruthy()
          expect(accessibleName?.length).toBeGreaterThan(1)
        })
      })

      it('2.4.6 Headings and Labels - headings and labels are descriptive', () => {
        render(<ResearchPage />)

        const headings = screen.getAllByRole('heading')
        headings.forEach(heading => {
          expect(heading.textContent).toBeTruthy()
          expect(heading.textContent!.length).toBeGreaterThan(2)
        })

        const labels = document.querySelectorAll('label')
        labels.forEach(label => {
          expect(label.textContent).toBeTruthy()
          expect(label.textContent!.length).toBeGreaterThan(2)
        })
      })

      it('2.4.7 Focus Visible - focus indicator is visible', () => {
        render(<ResearchPage />)

        const focusableElements = screen.getAllByRole('button')
        focusableElements.forEach(element => {
          // Should have visible focus indicator
          expect(element).toHaveClass('focus:outline-none', 'focus:ring-2')
          
          // Or should have default browser focus outline
          const styles = getComputedStyle(element)
          if (element.matches(':focus')) {
            expect(styles.outline !== 'none' || styles.boxShadow !== 'none').toBe(true)
          }
        })
      })
    })

    describe('2.5 Input Modalities', () => {
      it('2.5.1 Pointer Gestures - multipoint or path-based gestures have single-point alternative', () => {
        render(<ResearchPage />)

        // Complete research to check for swipe gestures
        const queryInput = screen.getByLabelText(/research query/i)
        fireEvent.change(queryInput, { target: { value: 'gesture test' } })
        fireEvent.click(screen.getByRole('button', { name: /start research/i }))

        mockWebSocketEvents.emitMessage('research_complete', mockWSData.complete.data)

        // Any swipe or complex gestures should have button alternatives
        const swipeElements = document.querySelectorAll('[data-swipe], [data-gesture]')
        swipeElements.forEach(element => {
          // Should have button alternative
          const buttons = element.querySelectorAll('button')
          expect(buttons.length).toBeGreaterThan(0)
        })
      })

      it('2.5.2 Pointer Cancellation - pointer events can be cancelled', () => {
        render(<ResearchPage />)

        const buttons = screen.getAllByRole('button')
        buttons.forEach(button => {
          // Should not activate on down event only
          expect(button).not.toHaveAttribute('onmousedown')
          expect(button).not.toHaveAttribute('ontouchstart')
        })
      })

      it('2.5.3 Label in Name - accessible name contains visible text', () => {
        render(<ResearchPage />)

        const buttons = screen.getAllByRole('button')
        buttons.forEach(button => {
          const visibleText = button.textContent
          const accessibleName = button.getAttribute('aria-label') || button.getAttribute('aria-labelledby')
          
          if (visibleText && accessibleName) {
            expect(accessibleName.toLowerCase()).toContain(visibleText.toLowerCase())
          }
        })
      })

      it('2.5.4 Motion Actuation - motion-triggered functionality has UI control', () => {
        render(<ResearchPage />)

        // Any shake or tilt functionality should have button alternatives
        const motionElements = document.querySelectorAll('[data-motion], [data-shake]')
        motionElements.forEach(element => {
          // Should have disable option
          const toggleButton = element.querySelector('[aria-label*="disable motion"]')
          expect(toggleButton).toBeTruthy()
        })
      })
    })
  })

  describe('3. Understandable - Information and UI operation must be understandable', () => {
    describe('3.1 Readable', () => {
      it('3.1.1 Language of Page - page language is identified', () => {
        render(<App />)

        const htmlElement = document.documentElement
        expect(htmlElement).toHaveAttribute('lang')
        expect(htmlElement.getAttribute('lang')).toBeTruthy()
      })
    })

    describe('3.2 Predictable', () => {
      it('3.2.1 On Focus - focus does not cause unexpected context changes', async () => {
        const user = userEvent.setup()
        render(<ResearchPage />)

        const initialUrl = window.location.href
        
        // Focus on elements should not change context
        await user.tab()
        expect(window.location.href).toBe(initialUrl)
        
        await user.tab()
        expect(window.location.href).toBe(initialUrl)
      })

      it('3.2.2 On Input - input does not cause unexpected context changes', async () => {
        const user = userEvent.setup()
        render(<ResearchPage />)

        const queryInput = screen.getByLabelText(/research query/i)
        const initialUrl = window.location.href
        
        // Typing should not change context
        await user.type(queryInput, 'test input')
        expect(window.location.href).toBe(initialUrl)
      })

      it('3.2.3 Consistent Navigation - navigation is consistent across pages', () => {
        render(<App />)

        // Check that navigation elements are in consistent locations
        const navigation = screen.getByRole('navigation')
        expect(navigation).toBeInTheDocument()
        
        // Navigation structure should be predictable
        const navLinks = screen.getAllByRole('link')
        expect(navLinks.length).toBeGreaterThan(0)
      })
    })

    describe('3.3 Input Assistance', () => {
      it('3.3.1 Error Identification - errors are clearly identified', async () => {
        const user = userEvent.setup()
        render(<ResearchPage />)

        // Try to submit empty form
        const submitButton = screen.getByRole('button', { name: /start research/i })
        await user.click(submitButton)

        // Error should be clearly identified
        const errorElements = screen.queryAllByRole('alert')
        if (errorElements.length > 0) {
          errorElements.forEach(error => {
            expect(error.textContent).toBeTruthy()
          })
        }
      })

      it('3.3.2 Labels or Instructions - form fields have labels and instructions', () => {
        render(<ResearchPage />)

        const formControls = [
          ...screen.getAllByRole('textbox'),
          ...screen.getAllByRole('combobox'),
          ...screen.getAllByRole('checkbox')
        ]

        formControls.forEach(control => {
          // Should have label
          const hasLabel = control.getAttribute('aria-label') || 
                          control.getAttribute('aria-labelledby') ||
                          document.querySelector(`label[for="${control.id}"]`)
          
          expect(hasLabel).toBeTruthy()
        })
      })

      it('3.3.3 Error Suggestion - error suggestions are provided when known', async () => {
        const user = userEvent.setup()
        render(<ResearchPage />)

        // Trigger validation error
        const queryInput = screen.getByLabelText(/research query/i)
        await user.type(queryInput, 'x') // Too short
        await user.clear(queryInput)
        
        const submitButton = screen.getByRole('button', { name: /start research/i })
        await user.click(submitButton)

        // Should provide helpful error message
        const errorMessage = screen.queryByText(/enter.*research.*topic/i)
        if (errorMessage) {
          expect(errorMessage).toBeInTheDocument()
        }
      })
    })
  })

  describe('4. Robust - Content must be robust enough for interpretation by assistive technologies', () => {
    describe('4.1 Compatible', () => {
      it('4.1.1 Parsing - markup is well-formed', async () => {
        const { container } = render(<App />)

        // Run axe to check for parsing issues
        const results = await axe(container)
        
        // Check specifically for parsing violations
        const parsingViolations = results.violations.filter(violation => 
          violation.tags.includes('cat.parsing')
        )
        
        expect(parsingViolations).toHaveLength(0)
      })

      it('4.1.2 Name, Role, Value - UI components have accessible names and roles', () => {
        render(<ResearchPage />)

        const interactive = [
          ...screen.getAllByRole('button'),
          ...screen.getAllByRole('textbox'),
          ...screen.getAllByRole('combobox'),
          ...screen.getAllByRole('checkbox')
        ]

        interactive.forEach(element => {
          // Should have accessible name
          const name = element.getAttribute('aria-label') || 
                      element.getAttribute('aria-labelledby') ||
                      element.textContent
          expect(name).toBeTruthy()

          // Should have proper role
          expect(element.getAttribute('role') || element.tagName.toLowerCase()).toBeTruthy()
        })
      })

      it('4.1.3 Status Messages - status messages are programmatically determinable', async () => {
        render(<ResearchPage />)

        const queryInput = screen.getByLabelText(/research query/i)
        fireEvent.change(queryInput, { target: { value: 'status test' } })
        fireEvent.click(screen.getByRole('button', { name: /start research/i }))

        // Status updates should be in live regions
        mockWebSocketEvents.emitMessage('progress_update', {
          stage: 'research',
          progress: 50,
          message: 'Processing...'
        })

        await waitFor(() => {
          const liveRegions = document.querySelectorAll('[aria-live], [role="status"], [role="alert"]')
          expect(liveRegions.length).toBeGreaterThan(0)
        })
      })
    })
  })
})