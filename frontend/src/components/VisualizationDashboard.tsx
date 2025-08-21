import React, { useState, useMemo } from 'react'
import { BarChart3, Eye, EyeOff, Filter, RefreshCw } from 'lucide-react'
import RelevanceChart from './charts/RelevanceChart'
import CategoryChart from './charts/CategoryChart'
import ScatterChart from './charts/ScatterChart'
import { ResearchResults } from '@/types/api'
import { cn } from '@/lib/utils'

interface VisualizationDashboardProps {
  results: ResearchResults
  className?: string
}

interface FilterState {
  relevanceRange?: string
  category?: string
  selectedPaper?: any
}

const VisualizationDashboard: React.FC<VisualizationDashboardProps> = ({
  results,
  className
}) => {
  const [filters, setFilters] = useState<FilterState>({})
  const [visibleCharts, setVisibleCharts] = useState({
    relevance: true,
    category: true,
    scatter: true,
  })
  const [isLoading, setIsLoading] = useState(false)

  // Extract papers from results
  const allPapers = useMemo(() => {
    return results.research_results?.papers || []
  }, [results])

  // Apply filters to papers
  const filteredPapers = useMemo(() => {
    let filtered = [...allPapers]

    // Filter by relevance range
    if (filters.relevanceRange) {
      const scoreRange = filters.relevanceRange.replace('score-', '')
      const score = parseInt(scoreRange)
      filtered = filtered.filter(paper => {
        const paperScore = paper.evaluation?.relevance_score
        return paperScore && Math.round(paperScore) === score
      })
    }

    // Filter by category
    if (filters.category) {
      filtered = filtered.filter(paper => {
        const title = paper.title.toLowerCase()
        switch (filters.category) {
          case 'CS.AI':
            return title.includes('artificial intelligence') || title.includes('ai')
          case 'CS.LG':
            return title.includes('machine learning') || title.includes('ml') || title.includes('neural')
          case 'CS.CV':
            return title.includes('computer vision') || title.includes('cv') || title.includes('image')
          case 'CS.CL':
            return title.includes('natural language') || title.includes('nlp') || title.includes('text')
          case 'CS.RO':
            return title.includes('robotics') || title.includes('robot')
          case 'CS.CC':
            return title.includes('computation') || title.includes('algorithm')
          default:
            return true
        }
      })
    }


    return filtered
  }, [allPapers, filters])

  const handleRelevanceFilter = (scoreRange: string) => {
    setFilters(prev => ({
      ...prev,
      relevanceRange: prev.relevanceRange === scoreRange ? undefined : scoreRange
    }))
  }

  const handleCategoryFilter = (category: string) => {
    setFilters(prev => ({
      ...prev,
      category: prev.category === category ? undefined : category
    }))
  }

  const handlePaperClick = (paper: any) => {
    setFilters(prev => ({
      ...prev,
      selectedPaper: prev.selectedPaper === paper ? undefined : paper
    }))
  }

  const clearFilters = () => {
    setIsLoading(true)
    setFilters({})
    setTimeout(() => setIsLoading(false), 300) // Simulate refresh animation
  }

  const toggleChart = (chartName: keyof typeof visibleCharts) => {
    setVisibleCharts(prev => ({
      ...prev,
      [chartName]: !prev[chartName]
    }))
  }

  const chartConfig = [
    {
      key: 'relevance' as const,
      title: 'Relevance Distribution',
      component: RelevanceChart,
      description: 'Paper quality scores from 1-10',
      icon: BarChart3,
    },
    {
      key: 'category' as const,
      title: 'Research Categories',
      component: CategoryChart,
      description: 'Distribution across research areas',
      icon: BarChart3,
    },
    {
      key: 'scatter' as const,
      title: 'Impact Analysis',
      component: ScatterChart,
      description: 'Relevance vs citation impact',
      icon: BarChart3,
    },
  ]

  const activeFilters = [
    filters.relevanceRange && `Relevance: ${filters.relevanceRange.replace('score-', '')}/10`,
    filters.category && `Category: ${filters.category}`,
    filters.selectedPaper && `Paper: ${filters.selectedPaper.title.substring(0, 30)}...`,
  ].filter(Boolean)

  if (!allPapers.length) {
    return (
      <div className={cn(
        "bg-card/50 backdrop-blur-sm rounded-xl border border-border p-8",
        "text-center",
        className
      )}>
        <div className="text-muted-foreground">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Visualization Data</h3>
          <p className="text-sm">
            Complete a research analysis to view interactive charts and insights.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Research Analytics
            </h2>
            <p className="text-muted-foreground">
              Interactive visualizations of {allPapers.length} analyzed papers
              {filteredPapers.length !== allPapers.length && (
                <span className="ml-2 text-primary">
                  ({filteredPapers.length} filtered)
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={clearFilters}
              disabled={activeFilters.length === 0 || isLoading}
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                activeFilters.length > 0
                  ? "text-primary hover:bg-primary/10"
                  : "text-muted-foreground cursor-not-allowed"
              )}
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              <span>Clear Filters</span>
            </button>
          </div>
        </div>

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Filter className="w-3 h-3" />
              <span>Active filters:</span>
            </div>
            {activeFilters.map((filter, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md border border-primary/20"
              >
                {filter}
              </span>
            ))}
          </div>
        )}

        {/* Chart Controls */}
        <div className="flex flex-wrap gap-2">
          {chartConfig.map(({ key, title, icon: Icon }) => (
            <button
              key={key}
              onClick={() => toggleChart(key)}
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                visibleCharts[key]
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {visibleCharts[key] ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
              <span>{title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Paper Details */}
      {filters.selectedPaper && (
        <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Selected Paper</h3>
            <button
              onClick={() => setFilters(prev => ({ ...prev, selectedPaper: undefined }))}
              className="text-muted-foreground hover:text-foreground"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">{filters.selectedPaper.title}</h4>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Authors:</span> {filters.selectedPaper.authors.join(', ')}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Published:</span> {filters.selectedPaper.published}
            </p>
            {filters.selectedPaper.evaluation?.relevance_score && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Relevance Score:</span>{' '}
                <span className="text-primary font-medium">
                  {filters.selectedPaper.evaluation.relevance_score}/10
                </span>
              </p>
            )}
            <p className="text-sm text-foreground leading-relaxed">
              {filters.selectedPaper.abstract}
            </p>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {chartConfig.map(({ key, component: ChartComponent }) => {
          if (!visibleCharts[key]) return null

          const chartProps = {
            papers: filteredPapers,
            onDataClick: key === 'relevance' ? handleRelevanceFilter : undefined,
            onCategoryClick: key === 'category' ? handleCategoryFilter : undefined,
            onPaperClick: key === 'scatter' ? handlePaperClick : undefined,
          }

          return (
            <div key={key} className={cn(
              "transform transition-all duration-300",
              isLoading && "animate-pulse"
            )}>
              <ChartComponent {...chartProps} />
            </div>
          )
        })}
      </div>

      {/* Summary Stats */}
      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Analysis Summary</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-background/50 rounded-lg">
            <div className="text-2xl font-bold text-primary mb-1">
              {results.execution_time_seconds?.toFixed(1)}s
            </div>
            <div className="text-xs text-muted-foreground">Analysis Time</div>
          </div>
          
          <div className="text-center p-3 bg-background/50 rounded-lg">
            <div className="text-2xl font-bold text-primary mb-1">
              {filteredPapers.filter(p => p.evaluation?.relevance_score >= 7).length}
            </div>
            <div className="text-xs text-muted-foreground">High Quality</div>
          </div>
          
          <div className="text-center p-3 bg-background/50 rounded-lg">
            <div className="text-2xl font-bold text-primary mb-1">
              {new Set(filteredPapers.flatMap(p => p.authors.slice(0, 3))).size}
            </div>
            <div className="text-xs text-muted-foreground">Unique Authors</div>
          </div>
          
          <div className="text-center p-3 bg-background/50 rounded-lg">
            <div className="text-2xl font-bold text-primary mb-1">
              {results.report?.recommendations?.length || 0}
            </div>
            <div className="text-xs text-muted-foreground">Recommendations</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VisualizationDashboard