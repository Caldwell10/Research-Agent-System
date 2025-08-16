import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search, Filter, Download, Zap, Plus } from 'lucide-react'
import useMobile from '@/hooks/useMobile'
import usePullToRefresh from '@/hooks/usePullToRefresh'
import useToast from '@/hooks/useToast'
import { useResearch } from '@/hooks/useResearch'
import { useWebSocket } from '@/contexts/WebSocketContext'
import useSearchHistory from '@/hooks/useSearchHistory'
import useFavorites from '@/hooks/useFavorites'
import MobileLayout from './MobileLayout'
import FloatingActionButton from './FloatingActionButton'
import BottomSheet from './BottomSheet'
import SwipeableCard from './SwipeableCard'
import { PaperSkeleton } from './LoadingSkeleton'
import { ResearchResults } from '@/types/api'
import { cn } from '@/lib/utils'

const MobileResearchPage: React.FC = () => {
  const { isMobile } = useMobile()
  const location = useLocation()
  const navigate = useNavigate()
  const { showToast, showError, showSuccess } = useToast()
  
  const [query, setQuery] = useState('')
  const [maxPapers, setMaxPapers] = useState(5)
  const [results, setResults] = useState<ResearchResults | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showNewSearch, setShowNewSearch] = useState(false)
  
  const { mutate: startResearch, isLoading, error } = useResearch()
  const { clearMessages } = useWebSocket()
  const { addSearch, updateSearchResults, searchHistory } = useSearchHistory()
  const { addToFavorites, isInFavorites } = useFavorites()

  // Pull to refresh
  const { elementRef: refreshRef, isRefreshing, pullDistance, shouldRefresh } = usePullToRefresh({
    onRefresh: async () => {
      if (results) {
        // Re-run the last search
        await handleSearch(query, maxPapers)
        showSuccess('Results refreshed')
      }
    },
    enabled: !!results && !isLoading
  })

  // Initialize from navigation state
  useEffect(() => {
    if (location.state) {
      const { query: stateQuery, maxPapers: stateMaxPapers } = location.state as any
      if (stateQuery) {
        setQuery(stateQuery)
        setShowNewSearch(true)
      }
      if (stateMaxPapers) setMaxPapers(stateMaxPapers)
    }
  }, [location.state])

  const handleSearch = async (searchQuery: string, papers: number) => {
    if (!searchQuery.trim()) {
      showError('Please enter a search query')
      return
    }

    clearMessages()
    setResults(null)
    setShowNewSearch(false)
    
    const searchId = addSearch({
      query: searchQuery.trim(),
      parameters: { max_papers: papers, save_report: true }
    })
    
    try {
      const data = await new Promise<ResearchResults>((resolve, reject) => {
        startResearch(
          { query: searchQuery.trim(), max_papers: papers, save_report: true },
          {
            onSuccess: resolve,
            onError: reject
          }
        )
      })

      setResults(data)
      
      const historyStatus = data.status === 'success' ? 'success' : 'failed'
      updateSearchResults(searchId, {
        status: historyStatus,
        papers_found: data.research_results?.papers?.length || 0,
        execution_time: data.execution_time_seconds || 0
      })

      if (data.status === 'success') {
        showSuccess('Research completed!')
      } else {
        showError('Research failed', 'Please try again with a different query')
      }
    } catch (err) {
      updateSearchResults(searchId, {
        status: 'error',
        papers_found: 0,
        execution_time: 0
      })
      showError('Research failed', 'Please check your connection and try again')
    }
  }

  const handlePaperSwipe = (paper: any, direction: 'left' | 'right') => {
    if (direction === 'right') {
      // Save to favorites
      addToFavorites(paper)
      showSuccess('Saved to favorites')
    } else {
      // Skip paper (could implement "not interested" functionality)
      showToast({
        type: 'info',
        title: 'Paper skipped',
        message: 'Swipe right to save papers you like'
      })
    }
  }

  if (!isMobile) {
    // Redirect to desktop version
    navigate('/research')
    return null
  }

  const headerActions = (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => setShowFilters(true)}
        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <Filter className="w-5 h-5" />
      </button>
      {results && (
        <button
          onClick={() => {/* Export functionality */}}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Download className="w-5 h-5" />
        </button>
      )}
    </div>
  )

  return (
    <MobileLayout
      headerTitle="Research"
      headerActions={headerActions}
      showBottomNav={true}
    >
      <div
        ref={refreshRef as React.RefObject<HTMLDivElement>}
        className="min-h-full"
      >
        {/* Pull to refresh indicator */}
        {pullDistance > 0 && (
          <div 
            className="absolute top-0 left-0 right-0 flex items-center justify-center bg-primary/10 backdrop-blur-sm transition-all duration-300"
            style={{ height: Math.min(pullDistance, 80) }}
          >
            <div className={cn(
              "flex items-center space-x-2 text-primary transition-all duration-300",
              shouldRefresh ? "scale-110" : "scale-100"
            )}>
              <div className={cn(
                "w-6 h-6 border-2 border-current rounded-full",
                shouldRefresh ? "animate-spin border-t-transparent" : ""
              )} />
              <span className="text-sm font-medium">
                {shouldRefresh ? 'Release to refresh' : 'Pull to refresh'}
              </span>
            </div>
          </div>
        )}

        <div className="p-4 space-y-6">
          {/* Quick search if no results */}
          {!results && !isLoading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Start Your Research
              </h2>
              <p className="text-muted-foreground mb-6">
                Discover and analyze academic papers with AI-powered insights
              </p>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="space-y-4">
              <div className="flex items-center justify-center p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-foreground">Analyzing papers...</span>
                </div>
              </div>
              {Array.from({ length: 3 }).map((_, i) => (
                <PaperSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Results */}
          {results?.research_results?.papers && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                  Found {results.research_results.papers.length} papers
                </h3>
                <span className="text-sm text-muted-foreground">
                  Swipe right to save
                </span>
              </div>

              {results.research_results.papers.map((paper, index) => {
                const isFavorited = isInFavorites(paper.arxiv_id || paper.title)
                
                return (
                  <SwipeableCard
                    key={index}
                    onSwipeLeft={() => handlePaperSwipe(paper, 'left')}
                    onSwipeRight={() => handlePaperSwipe(paper, 'right')}
                    onTap={() => {
                      // Navigate to paper details or open PDF
                      if (paper.pdf_url) {
                        window.open(paper.pdf_url, '_blank')
                      }
                    }}
                    showActions={true}
                    className="p-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-foreground leading-snug pr-2">
                          {paper.title}
                        </h4>
                        {paper.evaluation?.relevance_score && (
                          <div className="flex-shrink-0 px-2 py-1 bg-primary/10 text-primary rounded text-sm font-medium">
                            {paper.evaluation.relevance_score}/10
                          </div>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {paper.authors.slice(0, 2).join(', ')}
                        {paper.authors.length > 2 && ` +${paper.authors.length - 2} more`}
                      </p>
                      
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                        {paper.abstract}
                      </p>
                      
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-muted-foreground">
                          {paper.published}
                        </span>
                        {isFavorited && (
                          <div className="flex items-center space-x-1 text-red-500">
                            <Zap className="w-3 h-3 fill-current" />
                            <span className="text-xs">Saved</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </SwipeableCard>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton
        onClick={() => setShowNewSearch(true)}
        icon={isLoading ? 'loading' : 'search'}
        label="New Search"
        disabled={isLoading}
        position="bottom-right"
      />

      {/* Search Bottom Sheet */}
      <BottomSheet
        isOpen={showNewSearch}
        onClose={() => setShowNewSearch(false)}
        title="New Research"
        height="auto"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Research Query
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., machine learning for medical diagnosis..."
              className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground resize-none"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Maximum Papers
            </label>
            <select
              value={maxPapers}
              onChange={(e) => setMaxPapers(Number(e.target.value))}
              className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
            >
              <option value={3}>3 papers (Quick)</option>
              <option value={5}>5 papers (Balanced)</option>
              <option value={10}>10 papers (Comprehensive)</option>
            </select>
          </div>

          <button
            onClick={() => handleSearch(query, maxPapers)}
            disabled={!query.trim() || isLoading}
            className="w-full flex items-center justify-center space-x-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            <span>{isLoading ? 'Analyzing...' : 'Start Research'}</span>
          </button>
        </div>
      </BottomSheet>

      {/* Filters Bottom Sheet */}
      <BottomSheet
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filter Options"
        height="half"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Filter options will be available in the next update.
          </p>
        </div>
      </BottomSheet>
    </MobileLayout>
  )
}

export default MobileResearchPage