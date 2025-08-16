import React, { useRef } from 'react'
import { Scatter } from 'react-chartjs-2'
import { Download, MoreVertical, TrendingUp, Award } from 'lucide-react'
import { scatterChartOptions } from '@/lib/chartUtils'
import useChartExport from '@/hooks/useChartExport'
import { cn } from '@/lib/utils'

interface ScatterChartProps {
  papers: any[]
  className?: string
  onPaperClick?: (paper: any) => void
}

const ScatterChart: React.FC<ScatterChartProps> = ({
  papers,
  className,
  onPaperClick
}) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const { exportChartAsPNG, exportChartAsPDF, exportDataAsCSV } = useChartExport()

  // Process data for scatter plot (Relevance vs Citation Impact)
  // Note: Since we don't have citation data, we'll simulate it based on publication date and relevance
  const processScatterData = () => {
    const scatterData = papers
      .filter(paper => paper.evaluation?.relevance_score && paper.published)
      .map(paper => {
        const relevance = paper.evaluation.relevance_score
        // Simulate citation impact based on age and relevance (newer papers have fewer citations)
        const ageInYears = (Date.now() - new Date(paper.published).getTime()) / (1000 * 60 * 60 * 24 * 365)
        const baseCitations = Math.max(0, ageInYears * relevance * (Math.random() * 5 + 1))
        const simulatedCitations = Math.round(baseCitations)
        
        return {
          x: relevance,
          y: simulatedCitations,
          paper: paper,
          label: paper.title,
        }
      })

    // Color points based on relevance score
    const backgroundColor = scatterData.map(point => {
      if (point.x >= 8) return 'rgba(16, 185, 129, 0.8)' // green for high relevance
      if (point.x >= 6) return 'rgba(245, 158, 11, 0.8)' // yellow for medium relevance
      return 'rgba(239, 68, 68, 0.8)' // red for low relevance
    })

    const borderColor = scatterData.map(point => {
      if (point.x >= 8) return '#10B981'
      if (point.x >= 6) return '#F59E0B'
      return '#EF4444'
    })

    return {
      datasets: [{
        label: 'Papers',
        data: scatterData,
        backgroundColor,
        borderColor,
        borderWidth: 2,
        pointRadius: 8,
        pointHoverRadius: 12,
      }]
    }
  }

  const chartData = processScatterData()

  const handleExportPNG = () => {
    exportChartAsPNG(chartRef, { filename: 'relevance-vs-impact' })
  }

  const handleExportPDF = () => {
    exportChartAsPDF(chartRef, { filename: 'relevance-vs-impact' })
  }

  const handleExportCSV = () => {
    const csvData = chartData.datasets[0].data.map((point: any) => ({
      title: point.paper.title,
      relevance_score: point.x,
      estimated_citations: point.y,
      authors: point.paper.authors.join('; '),
      published: point.paper.published,
      arxiv_id: point.paper.arxiv_id || 'N/A',
    }))
    
    exportDataAsCSV(csvData, 'relevance-vs-impact-data')
  }

  const chartOptions = {
    ...scatterChartOptions,
    onClick: (event: any, elements: any[]) => {
      if (elements.length > 0 && onPaperClick) {
        const index = elements[0].index
        const paper = chartData.datasets[0].data[index].paper
        onPaperClick(paper)
      }
    },
    plugins: {
      ...scatterChartOptions.plugins,
      tooltip: {
        ...scatterChartOptions.plugins?.tooltip,
        callbacks: {
          title: (tooltipItems: any[]) => {
            const point = tooltipItems[0].raw
            return point.paper.title.length > 50 
              ? point.paper.title.substring(0, 50) + '...'
              : point.paper.title
          },
          label: (context: any) => {
            const point = context.raw
            return [
              `Relevance: ${point.x}/10`,
              `Est. Citations: ${point.y}`,
              `Authors: ${point.paper.authors.slice(0, 2).join(', ')}${point.paper.authors.length > 2 ? '...' : ''}`
            ]
          },
        },
      },
    },
    scales: {
      ...scatterChartOptions.scales,
      x: {
        ...scatterChartOptions.scales.x,
        min: 0,
        max: 10,
        title: {
          display: true,
          text: 'Relevance Score (1-10)',
          color: '#9CA3AF',
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 12,
            weight: 500,
          },
        },
        ticks: {
          ...scatterChartOptions.scales.x.ticks,
          stepSize: 1,
        },
      },
      y: {
        ...scatterChartOptions.scales.y,
        min: 0,
        title: {
          display: true,
          text: 'Estimated Citation Impact',
          color: '#9CA3AF',
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 12,
            weight: 500,
          },
        },
      },
    },
  }

  // Calculate statistics
  const totalPapers = chartData.datasets[0].data.length
  const highRelevancePapers = chartData.datasets[0].data.filter((point: any) => point.x >= 8).length
  const averageRelevance = totalPapers > 0 
    ? (chartData.datasets[0].data.reduce((sum: number, point: any) => sum + point.x, 0) / totalPapers).toFixed(1)
    : '0'
  const averageCitations = totalPapers > 0 
    ? (chartData.datasets[0].data.reduce((sum: number, point: any) => sum + point.y, 0) / totalPapers).toFixed(0)
    : '0'

  // Find correlation
  const correlation = calculateCorrelation(
    chartData.datasets[0].data.map((point: any) => point.x),
    chartData.datasets[0].data.map((point: any) => point.y)
  )

  return (
    <div 
      ref={chartRef}
      className={cn(
        "bg-card/50 backdrop-blur-sm rounded-xl border border-border p-6",
        "shadow-lg hover:shadow-xl transition-all duration-300",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Relevance vs Citation Impact
          </h3>
          <p className="text-sm text-muted-foreground">
            Relationship between relevance scores and estimated citations ({totalPapers} papers)
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="relative group">
            <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
            
            {/* Dropdown Menu */}
            <div className="absolute right-0 top-full mt-2 w-48 bg-popover border border-border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto z-10">
              <div className="p-2 space-y-1">
                <button
                  onClick={handleExportPNG}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-md transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Export as PNG</span>
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-md transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Export as PDF</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-md transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Data (CSV)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-background/50 rounded-lg border border-border/50">
          <div className="flex items-center justify-center mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div className="text-lg font-bold text-foreground mb-1">
            {correlation.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">Correlation</div>
        </div>
        
        <div className="text-center p-3 bg-background/50 rounded-lg border border-border/50">
          <div className="flex items-center justify-center mb-2">
            <Award className="w-4 h-4 text-primary" />
          </div>
          <div className="text-lg font-bold text-foreground mb-1">
            {highRelevancePapers}
          </div>
          <div className="text-xs text-muted-foreground">High Relevance</div>
        </div>
        
        <div className="text-center p-3 bg-background/50 rounded-lg border border-border/50">
          <div className="text-lg font-bold text-foreground mb-1">
            {averageRelevance}
          </div>
          <div className="text-xs text-muted-foreground">Avg. Relevance</div>
        </div>
        
        <div className="text-center p-3 bg-background/50 rounded-lg border border-border/50">
          <div className="text-lg font-bold text-foreground mb-1">
            {averageCitations}
          </div>
          <div className="text-xs text-muted-foreground">Avg. Citations</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80 relative">
        {totalPapers > 0 ? (
          <Scatter data={chartData} options={chartOptions} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <div className="text-lg mb-2">No data available</div>
              <div className="text-sm">No papers with relevance scores found</div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Click points to view paper details</span>
          <span>Note: Citation data is estimated for demonstration</span>
        </div>
        
        <div className="flex items-center justify-center space-x-6 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Low Relevance (1-5)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>Medium Relevance (6-7)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>High Relevance (8-10)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to calculate correlation coefficient
const calculateCorrelation = (x: number[], y: number[]): number => {
  if (x.length !== y.length || x.length === 0) return 0

  const n = x.length
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

  return denominator === 0 ? 0 : numerator / denominator
}

export default ScatterChart