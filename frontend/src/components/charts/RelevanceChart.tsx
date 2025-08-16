import React, { useRef } from 'react'
import { Bar } from 'react-chartjs-2'
import { Download, MoreVertical } from 'lucide-react'
import { barChartOptions, processRelevanceScores } from '@/lib/chartUtils'
import useChartExport from '@/hooks/useChartExport'
import { cn } from '@/lib/utils'

interface RelevanceChartProps {
  papers: any[]
  className?: string
  onDataClick?: (scoreRange: string) => void
}

const RelevanceChart: React.FC<RelevanceChartProps> = ({
  papers,
  className,
  onDataClick
}) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const { exportChartAsPNG, exportChartAsPDF, exportDataAsCSV } = useChartExport()

  const chartData = processRelevanceScores(papers)

  const handleExportPNG = () => {
    exportChartAsPNG(chartRef, { filename: 'relevance-scores' })
  }

  const handleExportPDF = () => {
    exportChartAsPDF(chartRef, { filename: 'relevance-scores' })
  }

  const handleExportCSV = () => {
    const csvData = papers
      .filter(paper => paper.evaluation?.relevance_score)
      .map(paper => ({
        title: paper.title,
        relevance_score: paper.evaluation.relevance_score,
        authors: paper.authors.join('; '),
        published: paper.published,
      }))
    exportDataAsCSV(csvData, 'relevance-scores-data')
  }

  const chartOptions = {
    ...barChartOptions,
    onClick: (event: any, elements: any[]) => {
      if (elements.length > 0 && onDataClick) {
        const index = elements[0].index
        const scoreRange = chartData.labels[index]
        onDataClick(`score-${scoreRange}`)
      }
    },
    plugins: {
      ...barChartOptions.plugins,
      tooltip: {
        ...barChartOptions.plugins?.tooltip,
        callbacks: {
          title: (tooltipItems: any[]) => {
            return `Relevance Score: ${tooltipItems[0].label}/10`
          },
          label: (context: any) => {
            const count = context.raw
            const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0)
            const percentage = ((count / total) * 100).toFixed(1)
            return `${count} papers (${percentage}%)`
          },
        },
      },
    },
    scales: {
      ...barChartOptions.scales,
      x: {
        ...barChartOptions.scales.x,
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
      },
      y: {
        ...barChartOptions.scales.y,
        title: {
          display: true,
          text: 'Number of Papers',
          color: '#9CA3AF',
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 12,
            weight: 500,
          },
        },
        ticks: {
          ...barChartOptions.scales.y.ticks,
          stepSize: 1,
        },
      },
    },
  }

  const totalPapers = papers.filter(p => p.evaluation?.relevance_score).length
  const averageScore = papers
    .filter(p => p.evaluation?.relevance_score)
    .reduce((sum, p) => sum + p.evaluation.relevance_score, 0) / totalPapers || 0

  const highQualityPapers = papers.filter(p => 
    p.evaluation?.relevance_score && p.evaluation.relevance_score >= 7
  ).length

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
            Relevance Score Distribution
          </h3>
          <p className="text-sm text-muted-foreground">
            Quality assessment of {totalPapers} analyzed papers
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
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-background/50 rounded-lg border border-border/50">
          <div className="text-2xl font-bold text-primary mb-1">
            {averageScore.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">Average Score</div>
        </div>
        <div className="text-center p-3 bg-background/50 rounded-lg border border-border/50">
          <div className="text-2xl font-bold text-primary mb-1">
            {highQualityPapers}
          </div>
          <div className="text-xs text-muted-foreground">High Quality (≥7)</div>
        </div>
        <div className="text-center p-3 bg-background/50 rounded-lg border border-border/50">
          <div className="text-2xl font-bold text-primary mb-1">
            {totalPapers}
          </div>
          <div className="text-xs text-muted-foreground">Total Papers</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80 relative">
        {totalPapers > 0 ? (
          <Bar data={chartData} options={chartOptions} />
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
      <div className="mt-4 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Click bars to filter results</span>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Low (1-4)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>Medium (5-6)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>High (7-10)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RelevanceChart