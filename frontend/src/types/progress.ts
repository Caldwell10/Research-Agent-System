export interface ProgressUpdate {
  type: 'status' | 'stage' | 'progress' | 'complete' | 'error' | 'research_started' | 'research_progress' | 'research_complete'
  stage?: 'researcher' | 'analyzer' | 'reporter' | 'research' | 'analysis' | 'reporting'
  message: string
  progress?: number // 0-100
  papers_found?: number
  papers_analyzed?: number
  current_paper?: number
  total_papers?: number
  estimated_time_remaining?: number
  timestamp?: string
  data?: any
}

export interface ProgressTrackerProps {
  isActive: boolean
  onCancel: () => void
  onComplete: (results: any) => void
  onError?: (error: string) => void
  query: string
  className?: string
}

export interface ResearchStage {
  id: 'researcher' | 'analyzer' | 'reporter'
  name: string
  description: string
  icon: string
  progressWeight: number // Percentage of total progress
  completed: boolean
  active: boolean
  error?: boolean
}

export interface ProgressState {
  currentStage: 'researcher' | 'analyzer' | 'reporter' | null
  overallProgress: number // 0-100
  stageProgress: number // 0-100 for current stage
  statusMessage: string
  estimatedTimeRemaining?: number
  papers: {
    found: number
    analyzed: number
    total: number
  }
  startTime: number
  isComplete: boolean
  hasError: boolean
  errorMessage?: string
}

export interface WebSocketProgressMessage {
  type: string
  data: {
    stage?: string
    message?: string
    progress?: number
    papers_found?: number
    papers_analyzed?: number
    query?: string
    max_papers?: number
    error?: string
  }
  timestamp: string
}