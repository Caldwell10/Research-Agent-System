import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render, mockWebSocketEvents } from '@/test/utils'
import ProgressTracker from '../ProgressTracker'
import { mockWebSocketEvents as mockWSData } from '@/test/mocks/data'

describe('ProgressTracker', () => {
  const defaultProps = {
    isActive: false,
    onCancel: vi.fn(),
    onComplete: vi.fn(),
    onError: vi.fn(),
    query: 'test query'
  }

  beforeEach(() => {
    mockWebSocketEvents.reset()
    vi.clearAllMocks()
  })

  it('renders inactive state correctly', () => {
    render(<ProgressTracker {...defaultProps} />)
    
    expect(screen.getByText(/ready to start/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
  })

  it('shows active state when research starts', () => {
    render(<ProgressTracker {...defaultProps} isActive={true} />)
    
    expect(screen.getByText(/initializing research/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel research/i })).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('updates progress based on WebSocket messages', async () => {
    render(<ProgressTracker {...defaultProps} isActive={true} />)
    
    // Emit research stage progress
    mockWebSocketEvents.emitMessage('progress_update', mockWSData.progressUpdate.data)
    
    await waitFor(() => {
      expect(screen.getByText(/searching and filtering papers/i)).toBeInTheDocument()
      expect(screen.getByText(/45%/)).toBeInTheDocument()
    })
    
    // Check progress bar value
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('aria-valuenow', '45')
  })

  it('shows stage completion animations', async () => {
    render(<ProgressTracker {...defaultProps} isActive={true} />)
    
    // Complete research stage
    mockWebSocketEvents.emitMessage('stage_complete', mockWSData.stageComplete.data)
    
    await waitFor(() => {
      expect(screen.getByText(/research stage completed/i)).toBeInTheDocument()
    })
    
    // Move to analysis stage
    mockWebSocketEvents.emitMessage('progress_update', mockWSData.analysisProgress.data)
    
    await waitFor(() => {
      expect(screen.getByText(/analyzing papers/i)).toBeInTheDocument()
      expect(screen.getByText(/75%/)).toBeInTheDocument()
    })
  })

  it('handles stage transitions correctly', async () => {
    render(<ProgressTracker {...defaultProps} isActive={true} />)
    
    // Start with research stage
    mockWebSocketEvents.emitMessage('progress_update', {
      stage: 'research',
      progress: 30,
      message: 'Searching...'
    })
    
    await waitFor(() => {
      expect(screen.getByText(/researcher agent/i)).toBeInTheDocument()
    })
    
    // Move to analysis stage
    mockWebSocketEvents.emitMessage('progress_update', {
      stage: 'analysis',
      progress: 60,
      message: 'Analyzing...'
    })
    
    await waitFor(() => {
      expect(screen.getByText(/analyzer agent/i)).toBeInTheDocument()
    })
    
    // Move to reporting stage
    mockWebSocketEvents.emitMessage('progress_update', {
      stage: 'reporting',
      progress: 90,
      message: 'Reporting...'
    })
    
    await waitFor(() => {
      expect(screen.getByText(/reporter agent/i)).toBeInTheDocument()
    })
  })

  it('shows completion state', async () => {
    const onComplete = vi.fn()
    render(<ProgressTracker {...defaultProps} isActive={true} onComplete={onComplete} />)
    
    // Complete the research
    mockWebSocketEvents.emitMessage('research_complete', mockWSData.complete.data)
    
    await waitFor(() => {
      expect(screen.getByText(/research completed successfully/i)).toBeInTheDocument()
      expect(onComplete).toHaveBeenCalled()
    })
    
    // Should show completion animation
    expect(screen.getByText(/100%/)).toBeInTheDocument()
  })

  it('handles errors gracefully', async () => {
    const onError = vi.fn()
    render(<ProgressTracker {...defaultProps} isActive={true} onError={onError} />)
    
    // Emit error
    mockWebSocketEvents.emitMessage('research_error', mockWSData.error.data)
    
    await waitFor(() => {
      expect(screen.getByText(/error occurred/i)).toBeInTheDocument()
      expect(onError).toHaveBeenCalledWith('Network timeout while fetching papers')
    })
    
    // Should show error state
    expect(screen.getByText(/network timeout/i)).toBeInTheDocument()
  })

  it('handles cancellation', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    
    render(<ProgressTracker {...defaultProps} isActive={true} onCancel={onCancel} />)
    
    const cancelButton = screen.getByRole('button', { name: /cancel research/i })
    await user.click(cancelButton)
    
    expect(onCancel).toHaveBeenCalled()
  })

  it('displays detailed progress information', async () => {
    render(<ProgressTracker {...defaultProps} isActive={true} />)
    
    // Emit progress with details
    mockWebSocketEvents.emitMessage('progress_update', {
      stage: 'research',
      progress: 45,
      message: 'Searching and filtering papers...',
      details: {
        papers_found: 12,
        papers_filtered: 8,
        current_task: 'Evaluating paper relevance'
      }
    })
    
    await waitFor(() => {
      expect(screen.getByText(/12 papers found/i)).toBeInTheDocument()
      expect(screen.getByText(/8 papers filtered/i)).toBeInTheDocument()
      expect(screen.getByText(/evaluating paper relevance/i)).toBeInTheDocument()
    })
  })

  it('shows time elapsed during research', async () => {
    render(<ProgressTracker {...defaultProps} isActive={true} />)
    
    // Wait for time to pass
    await waitFor(() => {
      expect(screen.getByText(/elapsed/i)).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('handles WebSocket disconnection', async () => {
    render(<ProgressTracker {...defaultProps} isActive={true} />)
    
    // Simulate disconnection
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

  it('renders with custom className', () => {
    const { container } = render(
      <ProgressTracker {...defaultProps} className="custom-class" />
    )
    
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('shows appropriate icons for each stage', async () => {
    render(<ProgressTracker {...defaultProps} isActive={true} />)
    
    // Research stage
    mockWebSocketEvents.emitMessage('progress_update', {
      stage: 'research',
      progress: 30
    })
    
    await waitFor(() => {
      expect(screen.getByTestId('research-icon')).toBeInTheDocument()
    })
    
    // Analysis stage
    mockWebSocketEvents.emitMessage('progress_update', {
      stage: 'analysis',
      progress: 60
    })
    
    await waitFor(() => {
      expect(screen.getByTestId('analysis-icon')).toBeInTheDocument()
    })
    
    // Reporting stage
    mockWebSocketEvents.emitMessage('progress_update', {
      stage: 'reporting',
      progress: 90
    })
    
    await waitFor(() => {
      expect(screen.getByTestId('reporting-icon')).toBeInTheDocument()
    })
  })

  it('maintains accessibility standards', () => {
    render(<ProgressTracker {...defaultProps} isActive={true} />)
    
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('aria-label')
    expect(progressBar).toHaveAttribute('aria-valuemin', '0')
    expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    
    const cancelButton = screen.getByRole('button', { name: /cancel research/i })
    expect(cancelButton).toHaveAttribute('aria-label')
  })
})