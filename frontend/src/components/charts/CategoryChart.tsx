import React, { useRef } from 'react'
import { Pie } from 'react-chartjs-2'
import { Download, MoreVertical, Tag, Hash } from 'lucide-react'
import { pieChartOptions, processResearchCategories } from '@/lib/chartUtils'
import useChartExport from '@/hooks/useChartExport'
import { cn } from '@/lib/utils'

interface CategoryChartProps {
  papers: any[]
  className?: string
  onCategoryClick?: (category: string) => void
}

const CategoryChart: React.FC<CategoryChartProps> = ({
  papers,
  className,
  onCategoryClick
}) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const { exportChartAsPNG, exportChartAsPDF, exportDataAsCSV } = useChartExport()

  const chartData = processResearchCategories(papers)

  const handleExportPNG = () => {
    exportChartAsPNG(chartRef, { filename: 'research-categories' })
  }

  const handleExportPDF = () => {
    exportChartAsPDF(chartRef, { filename: 'research-categories' })
  }

  const handleExportCSV = () => {
    const categoryData = chartData.labels.map((label, index) => ({
      category: label,
      paper_count: chartData.datasets[0].data[index],
      percentage: ((chartData.datasets[0].data[index] / papers.length) * 100).toFixed(1)
    }))
    
    exportDataAsCSV(categoryData, 'research-categories-data')
  }

  const chartOptions = {
    ...pieChartOptions,
    onClick: (event: any, elements: any[]) => {
      if (elements.length > 0 && onCategoryClick) {
        const index = elements[0].index
        const category = chartData.labels[index]
        onCategoryClick(category)
      }
    },
    plugins: {
      ...pieChartOptions.plugins,
      legend: {
        ...pieChartOptions.plugins?.legend,
        position: 'bottom' as const,
        labels: {
          ...pieChartOptions.plugins?.legend?.labels,
          padding: 20,
          usePointStyle: true,
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 11,
          },
        },
      },
    },
  }

  const totalPapers = papers.length
  const categorizedPapers = chartData.datasets[0].data.reduce((sum: number, val: number) => sum + val, 0)
  const uncategorized = totalPapers - categorizedPapers

  // Category descriptions
  const categoryDescriptions: { [key: string]: string } = {
    'CS.AI': 'Artificial Intelligence',
    'CS.LG': 'Machine Learning',
    'CS.CV': 'Computer Vision',
    'CS.CL': 'Natural Language Processing',
    'CS.RO': 'Robotics',
    'CS.CC': 'Computational Complexity',
    'Other': 'Other Categories'
  }

  const mostPopularCategory = chartData.labels.length > 0 
    ? chartData.labels[chartData.datasets[0].data.indexOf(Math.max(...chartData.datasets[0].data))]
    : 'None'

  const diversityScore = chartData.labels.length > 0
    ? (chartData.labels.length / Math.max(chartData.labels.length, 1) * 100).toFixed(0)
    : '0'

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
            Research Categories
          </h3>
          <p className="text-sm text-muted-foreground">
            Distribution across arXiv categories ({totalPapers} papers)
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-background/50 rounded-lg border border-border/50">
          <div className="flex items-center justify-center mb-2">
            <Tag className="w-4 h-4 text-primary" />
          </div>
          <div className="text-lg font-bold text-foreground mb-1">
            {chartData.labels.length}
          </div>
          <div className="text-xs text-muted-foreground">Categories</div>
        </div>
        
        <div className="text-center p-3 bg-background/50 rounded-lg border border-border/50">
          <div className="flex items-center justify-center mb-2">
            <Hash className="w-4 h-4 text-primary" />
          </div>
          <div className="text-lg font-bold text-foreground mb-1">
            {diversityScore}%
          </div>
          <div className="text-xs text-muted-foreground">Diversity</div>
        </div>
        
        <div className="col-span-2 md:col-span-1 text-center p-3 bg-background/50 rounded-lg border border-border/50">
          <div className="text-sm font-medium text-foreground mb-1 truncate">
            {mostPopularCategory}
          </div>
          <div className="text-xs text-muted-foreground">Most Popular</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80 relative">
        {totalPapers > 0 ? (
          <Pie data={chartData} options={chartOptions} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <div className="text-lg mb-2">No data available</div>
              <div className="text-sm">No papers found to categorize</div>
            </div>
          </div>
        )}
      </div>

      {/* Category Details */}
      {chartData.labels.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-medium text-foreground">Category Breakdown</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {chartData.labels.map((label, index) => {
              const count = chartData.datasets[0].data[index]
              const percentage = ((count / totalPapers) * 100).toFixed(1)
              const color = chartData.datasets[0].backgroundColor[index]
              const description = categoryDescriptions[label] || label
              
              return (
                <div
                  key={label}
                  className="flex items-center justify-between p-2 rounded-lg bg-background/30 hover:bg-background/50 transition-colors cursor-pointer"
                  onClick={() => onCategoryClick?.(label)}
                >
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: color }}
                    />
                    <div>
                      <div className="text-sm font-medium text-foreground">{label}</div>
                      <div className="text-xs text-muted-foreground">{description}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-foreground">{count}</div>
                    <div className="text-xs text-muted-foreground">{percentage}%</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Click segments to filter by category</span>
          {uncategorized > 0 && (
            <span>{uncategorized} papers uncategorized</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default CategoryChart