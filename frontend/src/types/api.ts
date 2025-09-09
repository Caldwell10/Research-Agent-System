export interface ResearchRequest {
  query: string
  max_papers?: number
  save_report?: boolean
}

export interface Paper {
  title: string
  authors: string[]
  abstract: string
  published: string
  arxiv_id: string
  pdf_url: string
  evaluation?: {
    relevance_score: number
    key_contributions: string[]
    limitations: string[]
    importance: string
  }
}

export interface ResearchResults {
  status: 'completed' | 'error' | 'failed_research' | 'failed_analysis' | 'failed_reporting'
  query: string
  timestamp: string
  
  // New metrics structure from backend
  metrics?: {
    papers_found: number
    execution_time_seconds: number
    key_insights_count: number
    recommendations_count: number
    research_stages_completed: number
  }
  
  // Error information (if status is 'error')
  error?: {
    message: string
    type: string
    duration: number
  }
  
  research_results?: {
    status: string
    query: string
    papers: Paper[]
    papers_found: number
    summary: string
  }
  
  analysis_results?: {
    status: string
    insights: {
      trending_methods: string[]
      research_gaps: string[]
      key_findings: string[]
      methodological_patterns: string[]
    }
    technical_analysis: {
      datasets_used: string[]
      evaluation_metrics: string[]
      computational_requirements: string[]
    }
  }
  
  report?: {
    executive_summary: string
    recommendations: string[]
    saved_to?: string
  }
  
  summary?: {
    papers_found: number
    top_paper: string
    report_saved_to: string
    key_insights: number
    recommendations: number
  }
  
  progress_updates?: Array<{
    stage: string
    message: string
    timestamp: string
  }>
  
  full_results?: any
}

export interface HealthCheck {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  version?: string
}

export interface WebSocketMessage {
  type: 'research_started' | 'research_progress' | 'research_complete' | 'error'
  data: any
  timestamp: string
}