import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useResearch } from '@/hooks/useResearch'
import { useWebSocket } from '@/contexts/WebSocketContext'
import useSearchHistory from '@/hooks/useSearchHistory'
import useFavorites from '@/hooks/useFavorites'
import useAdvancedExport from '@/hooks/useAdvancedExport'
import { ResearchResults } from '@/types/api'
import ProgressTracker from '@/components/ProgressTracker'
import VisualizationDashboard from '@/components/VisualizationDashboard'
import { cn } from '@/lib/utils'
import { 
  Search, 
  FileText, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Download,
  ExternalLink,
  BarChart3,
  Heart,
  History,
  ChevronDown
} from 'lucide-react'

const ResearchPage: React.FC = () => {
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [maxPapers, setMaxPapers] = useState(5)
  const [results, setResults] = useState<ResearchResults | null>(null)
  const [showVisualization, setShowVisualization] = useState(false)
  const [showRecentSearches, setShowRecentSearches] = useState(false)
  const { mutate: startResearch, isLoading, error } = useResearch()
  const { clearMessages } = useWebSocket()
  const { addSearch, updateSearchResults, searchHistory } = useSearchHistory()
  const { addToFavorites, isInFavorites } = useFavorites()
  const { exportToJSON } = useAdvancedExport()

  // Get recent searches for dropdown
  const recentSearches = searchHistory
    .filter(s => s.results?.status === 'success')
    .slice(0, 5)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowRecentSearches(false)
    if (showRecentSearches) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showRecentSearches])

  // Initialize from navigation state if available
  useEffect(() => {
    if (location.state) {
      const { query: stateQuery, maxPapers: stateMaxPapers } = location.state as any
      if (stateQuery) setQuery(stateQuery)
      if (stateMaxPapers) setMaxPapers(stateMaxPapers)
    }
  }, [location.state])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    clearMessages()
    setResults(null)
    
    // Add to search history
    const searchId = addSearch({
      query: query.trim(),
      parameters: { max_papers: maxPapers, save_report: true }
    })
    
    startResearch(
      { query: query.trim(), max_papers: maxPapers, save_report: true },
      {
        onSuccess: (data) => {
          setResults(data)
          
          // Update search history with results
          const historyStatus = data.status === 'success' ? 'success' : 'failed'
          updateSearchResults(searchId, {
            status: historyStatus,
            papers_found: data.research_results?.papers?.length || 0,
            execution_time: data.execution_time_seconds || 0
          })
          
          // Automatically show visualization if we have successful results with papers
          if (data.status === 'success' && data.research_results?.papers && data.research_results.papers.length > 0) {
            setShowVisualization(true)
          }
        },
        onError: () => {
          // Update search history with error
          updateSearchResults(searchId, {
            status: 'error',
            papers_found: 0,
            execution_time: 0
          })
        }
      }
    )
  }

  const handleCancel = () => {
    // TODO: Implement research cancellation
    console.log('Cancel research requested')
  }

  const handleProgressComplete = () => {
    console.log('Progress tracker completed')
    // Results will be set by the mutation success callback
  }

  const handleProgressError = (errorMessage: string) => {
    console.error('Progress tracker error:', errorMessage)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400'
      case 'error': return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400'
      case 'failed_research':
      case 'failed_analysis':
      case 'failed_reporting':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400'
      default: return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5" />
      case 'error': return <AlertCircle className="w-5 h-5" />
      default: return <Clock className="w-5 h-5" />
    }
  }

  const handleDownloadReport = async () => {
    if (!results) return
    
    try {
      const filename = `research-report-${query.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}`
      
      await exportToJSON(results, {
        format: 'json',
        filename,
        include_abstracts: true,
        include_notes: true,
        include_tags: true
      })
    } catch (error) {
      console.error('Error downloading report:', error)
      alert('Failed to download report. Please try again.')
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Research Form */}
      <div className="bg-card rounded-lg border border-border p-6 mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Research Analysis</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label htmlFor="query" className="block text-sm font-medium text-foreground mb-2">
              Research Query
            </label>
            <div className="relative">
              <input
                id="query"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowRecentSearches(true)}
                placeholder="e.g., deep learning for computer vision, quantum computing algorithms..."
                className="w-full px-4 py-3 pr-10 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                disabled={isLoading}
              />
              {recentSearches.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowRecentSearches(!showRecentSearches)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <History className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* Recent Searches Dropdown */}
            {showRecentSearches && recentSearches.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg">
                <div className="p-2">
                  <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Recent Searches</div>
                  {recentSearches.map((search) => (
                    <button
                      key={search.id}
                      type="button"
                      onClick={() => {
                        setQuery(search.query)
                        setMaxPapers(search.parameters.max_papers)
                        setShowRecentSearches(false)
                      }}
                      className="w-full text-left px-2 py-2 hover:bg-accent rounded text-sm text-foreground"
                    >
                      <div className="font-medium">{search.query}</div>
                      <div className="text-xs text-muted-foreground">
                        {search.results?.papers_found} papers • {search.parameters.max_papers} max
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label htmlFor="maxPapers" className="block text-sm font-medium text-foreground mb-2">
                Maximum Papers
              </label>
              <select
                id="maxPapers"
                value={maxPapers}
                onChange={(e) => setMaxPapers(Number(e.target.value))}
                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                disabled={isLoading}
              >
                <option value={3}>3 papers (Quick)</option>
                <option value={5}>5 papers (Balanced)</option>
                <option value={10}>10 papers (Comprehensive)</option>
              </select>
            </div>
            
            <div className="flex-shrink-0">
              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="flex items-center space-x-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground px-6 py-3 rounded-lg font-medium transition-colors mt-7"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
                <span>{isLoading ? 'Researching...' : 'Start Research'}</span>
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="text-red-600 dark:text-red-400">
                Error: {error.message}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Progress Tracker */}
      <ProgressTracker
        isActive={isLoading}
        onCancel={handleCancel}
        onComplete={handleProgressComplete}
        onError={handleProgressError}
        query={query}
        className="mb-8"
      />

      {/* Results */}
      {results && (
        <div className="space-y-8">
          {/* Status Summary */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">Research Complete</h2>
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${getStatusColor(results.status)}`}>
                {getStatusIcon(results.status)}
                <span className="capitalize">{results.status.replace('_', ' ')}</span>
              </div>
            </div>
            
            {results.summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-background rounded-lg">
                  <div className="text-2xl font-bold text-primary">{results.summary.papers_found}</div>
                  <div className="text-sm text-muted-foreground">Papers Found</div>
                </div>
                <div className="text-center p-3 bg-background rounded-lg">
                  <div className="text-2xl font-bold text-primary">{results.execution_time_seconds?.toFixed(1)}s</div>
                  <div className="text-sm text-muted-foreground">Analysis Time</div>
                </div>
                <div className="text-center p-3 bg-background rounded-lg">
                  <div className="text-2xl font-bold text-primary">{results.summary.key_insights}</div>
                  <div className="text-sm text-muted-foreground">Key Insights</div>
                </div>
                <div className="text-center p-3 bg-background rounded-lg">
                  <div className="text-2xl font-bold text-primary">{results.summary.recommendations}</div>
                  <div className="text-sm text-muted-foreground">Recommendations</div>
                </div>
              </div>
            )}
          </div>

          {/* Executive Summary */}
          {results.report?.executive_summary && (
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Executive Summary</span>
              </h3>
              <div className="prose prose-sm max-w-none text-foreground">
                {results.report.executive_summary}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {results.report?.recommendations && results.report.recommendations.length > 0 && (
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Recommendations
              </h3>
              <ul className="space-y-2">
                {results.report.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Papers Found */}
          {results.research_results?.papers && results.research_results.papers.length > 0 && (
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Papers Analyzed</span>
              </h3>
              <div className="space-y-4">
                {results.research_results.papers.map((paper, index) => {
                  const isFavorited = isInFavorites(paper.arxiv_id || paper.title)
                  
                  return (
                    <div key={index} className="p-4 bg-background rounded-lg border border-border group">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-foreground pr-4">{paper.title}</h4>
                        <div className="flex items-center space-x-2">
                          {paper.evaluation?.relevance_score && (
                            <div className="flex-shrink-0 px-2 py-1 bg-primary/10 text-primary rounded text-sm font-medium">
                              {paper.evaluation.relevance_score}/10
                            </div>
                          )}
                          
                          {/* Save to Favorites Button */}
                          <button
                            onClick={() => addToFavorites(paper)}
                            className={cn(
                              "p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100",
                              isFavorited 
                                ? "text-red-500 bg-red-50 dark:bg-red-900/20" 
                                : "text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            )}
                            title={isFavorited ? "Already in favorites" : "Save to favorites"}
                            disabled={isFavorited}
                          >
                            <Heart className={cn("w-4 h-4", isFavorited && "fill-current")} />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {paper.authors.slice(0, 3).join(', ')}
                        {paper.authors.length > 3 && ` +${paper.authors.length - 3} more`}
                      </p>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                        {paper.abstract}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="text-muted-foreground">{paper.published}</span>
                          {paper.pdf_url && (
                            <a
                              href={paper.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-1 text-primary hover:text-primary/80 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span>View PDF</span>
                            </a>
                          )}
                        </div>
                        
                        {/* Bulk Selection Checkbox */}
                        <input
                          type="checkbox"
                          className="rounded border-border text-primary focus:ring-primary opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Select for bulk operations"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Download Report */}
          {results.summary?.report_saved_to && (
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Full Report</h3>
                  <p className="text-sm text-muted-foreground">
                    Complete analysis saved to: {results.summary.report_saved_to}
                  </p>
                </div>
                <button 
                  onClick={() => handleDownloadReport()}
                  className="flex items-center space-x-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Visualization Dashboard */}
      {results && results.status === 'success' && results.research_results?.papers && (
        <div className="space-y-6">
          {/* Visualization Toggle */}
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Research Analytics</h3>
                  <p className="text-sm text-muted-foreground">
                    Interactive visualizations and insights from {results.research_results.papers.length} analyzed papers
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setShowVisualization(!showVisualization)}
                className={cn(
                  "flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors",
                  showVisualization
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-accent-foreground hover:bg-accent/80"
                )}
              >
                <BarChart3 className="w-4 h-4" />
                <span>{showVisualization ? 'Hide Analytics' : 'Show Analytics'}</span>
              </button>
            </div>
          </div>

          {/* Visualization Dashboard */}
          {showVisualization && (
            <div className="animate-slide-up">
              <VisualizationDashboard results={results} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ResearchPage