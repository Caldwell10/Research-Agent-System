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
  status: 'success' | 'failed_research' | 'failed_analysis' | 'failed_reporting' | 'error'
  query: string
  execution_time_seconds?: number
  papers_analyzed?: number
  papers_found?: number
  message?: string
  error?: string
  
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