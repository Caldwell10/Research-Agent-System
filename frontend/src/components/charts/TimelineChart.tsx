import React, { useRef, useState } from 'react'
import { Line } from 'react-chartjs-2'
import { Download, MoreVertical, Calendar, TrendingUp } from 'lucide-react'
import { lineChartOptions, processPublicationTimeline } from '@/lib/chartUtils'
import useChartExport from '@/hooks/useChartExport'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface TimelineChartProps {
  papers: any[]
  className?: string
  onDateRangeSelect?: (startDate: string, endDate: string) => void
}

const TimelineChart: React.FC<TimelineChartProps> = ({
  papers,
  className,
  onDateRangeSelect
}) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const [selectedRange, setSelectedRange] = useState<{ start: string; end: string } | null>(null)
  const { exportChartAsPNG, exportChartAsPDF, exportDataAsCSV } = useChartExport()

  const chartData = processPublicationTimeline(papers)

  const handleExportPNG = () => {
    exportChartAsPNG(chartRef, { filename: 'publication-timeline' })
  }

  const handleExportPDF = () => {
    exportChartAsPDF(chartRef, { filename: 'publication-timeline' })
  }

  const handleExportCSV = () => {
    const csvData = papers
      .filter(paper => paper.published)
      .map(paper => ({
        title: paper.title,
        published_date: paper.published,
        authors: paper.authors.join('; '),
        relevance_score: paper.evaluation?.relevance_score || 'N/A',
        arxiv_id: paper.arxiv_id || 'N/A',
      }))
      .sort((a, b) => new Date(a.published_date).getTime() - new Date(b.published_date).getTime())
    
    exportDataAsCSV(csvData, 'publication-timeline-data')
  }

  const chartOptions = {
    ...lineChartOptions,
    scales: {
      ...lineChartOptions.scales,
      x: {
        ...lineChartOptions.scales.x,
        type: 'time' as const,
        time: {
          unit: 'month' as const,
          displayFormats: {
            month: 'MMM yyyy'
          }
        },
        title: {
          display: true,
          text: 'Publication Date',
          color: '#9CA3AF',
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 12,
            weight: 500,
          },
        },
      },
      y: {
        ...lineChartOptions.scales.y,
        title: {
          display: true,
          text: 'Papers Published',
          color: '#9CA3AF',
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 12,
            weight: 500,
          },
        },
        ticks: {
          ...lineChartOptions.scales.y.ticks,
          stepSize: 1,
        },
      },
    },
    plugins: {
      ...lineChartOptions.plugins,
      tooltip: {
        ...lineChartOptions.plugins?.tooltip,
        callbacks: {
          title: (tooltipItems: any[]) => {
            try {
              const date = new Date(tooltipItems[0].label)
              if (isNaN(date.getTime())) {
                return tooltipItems[0].label
              }
              return format(date, 'MMMM yyyy')
            } catch (error) {
              return tooltipItems[0].label
            }
          },
          label: (context: any) => {
            return `${context.raw} papers published`
          },
        },
      },
    },
    onClick: (event: any, elements: any[]) => {
      if (elements.length > 0 && onDateRangeSelect) {
        const index = elements[0].index
        const date = chartData.labels[index]
        const startDate = new Date(date + '-01')
        const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)
        
        setSelectedRange({
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        })
        
        onDateRangeSelect(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        )
      }
    },
  }

  // Calculate stats
  const totalPapers = papers.filter(p => p.published).length
  const papersWithDates = papers
    .filter(p => p.published)
    .map(p => {
      const date = new Date(p.published)
      return { ...p, date: isNaN(date.getTime()) ? new Date() : date }
    })
    .filter(p => !isNaN(p.date.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  const oldestPaper = papersWithDates[0]
  const newestPaper = papersWithDates[papersWithDates.length - 1]
  
  const timeSpanMonths = oldestPaper && newestPaper 
    ? Math.max(1, Math.round((newestPaper.date.getTime() - oldestPaper.date.getTime()) / (1000 * 60 * 60 * 24 * 30)))
    : 0

  const averagePerMonth = timeSpanMonths > 0 ? (totalPapers / timeSpanMonths).toFixed(1) : '0'

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
            Publication Timeline
          </h3>
          <p className="text-sm text-muted-foreground">
            Papers published over time ({totalPapers} papers)
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
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div className="text-lg font-bold text-foreground mb-1">
            {timeSpanMonths}
          </div>
          <div className="text-xs text-muted-foreground">Months Covered</div>
        </div>
        
        <div className="text-center p-3 bg-background/50 rounded-lg border border-border/50">
          <div className="flex items-center justify-center mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div className="text-lg font-bold text-foreground mb-1">
            {averagePerMonth}
          </div>
          <div className="text-xs text-muted-foreground">Papers/Month</div>
        </div>
        
        <div className="text-center p-3 bg-background/50 rounded-lg border border-border/50">
          <div className="text-lg font-bold text-foreground mb-1">
            {oldestPaper && !isNaN(oldestPaper.date.getTime()) ? format(oldestPaper.date, 'yyyy') : 'N/A'}
          </div>
          <div className="text-xs text-muted-foreground">Earliest</div>
        </div>
        
        <div className="text-center p-3 bg-background/50 rounded-lg border border-border/50">
          <div className="text-lg font-bold text-foreground mb-1">
            {newestPaper && !isNaN(newestPaper.date.getTime()) ? format(newestPaper.date, 'yyyy') : 'N/A'}
          </div>
          <div className="text-xs text-muted-foreground">Latest</div>
        </div>
      </div>

      {/* Selected Range Info */}
      {selectedRange && (
        <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm text-foreground">
              <span className="font-medium">Selected Range:</span>{' '}
              {format(new Date(selectedRange.start), 'MMM yyyy')} - {format(new Date(selectedRange.end), 'MMM yyyy')}
            </div>
            <button
              onClick={() => setSelectedRange(null)}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="h-80 relative">
        {totalPapers > 0 ? (
          <Line data={chartData} options={chartOptions} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <div className="text-lg mb-2">No data available</div>
              <div className="text-sm">No papers with publication dates found</div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Click points to filter by date range</span>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Publications</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TimelineChart