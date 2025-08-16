// Import Chart.js setup (this handles registration)
import './chartSetup'

// Chart theme colors for dark mode
export const chartColors = {
  primary: '#3B82F6',
  primaryDark: '#1E40AF',
  secondary: '#64748B',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#06B6D4',
  purple: '#8B5CF6',
  pink: '#EC4899',
  indigo: '#6366F1',
  
  // Gradients
  primaryGradient: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
  
  // Chart-specific palettes
  categoryColors: [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
    '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1'
  ],
  
  // Background colors with transparency
  backgroundColors: [
    'rgba(59, 130, 246, 0.8)',
    'rgba(16, 185, 129, 0.8)',
    'rgba(245, 158, 11, 0.8)',
    'rgba(239, 68, 68, 0.8)',
    'rgba(139, 92, 246, 0.8)',
    'rgba(236, 72, 153, 0.8)',
    'rgba(6, 182, 212, 0.8)',
    'rgba(99, 102, 241, 0.8)'
  ],
  
  borderColors: [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1'
  ]
}

// Default chart options for dark theme
export const defaultChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'index' as const,
  },
  plugins: {
    legend: {
      labels: {
        color: '#D1D5DB', // text-gray-300
        font: {
          family: 'Inter, system-ui, sans-serif',
          size: 12,
        },
        usePointStyle: true,
        padding: 20,
      },
    },
    tooltip: {
      backgroundColor: 'rgba(17, 24, 39, 0.95)', // gray-900 with opacity
      titleColor: '#F9FAFB', // text-gray-50
      bodyColor: '#D1D5DB', // text-gray-300
      borderColor: '#374151', // gray-700
      borderWidth: 1,
      cornerRadius: 8,
      padding: 12,
      font: {
        family: 'Inter, system-ui, sans-serif',
      },
    },
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(55, 65, 81, 0.3)', // gray-700 with opacity
        drawBorder: false,
      },
      ticks: {
        color: '#9CA3AF', // text-gray-400
        font: {
          family: 'Inter, system-ui, sans-serif',
          size: 11,
        },
      },
    },
    y: {
      grid: {
        color: 'rgba(55, 65, 81, 0.3)', // gray-700 with opacity
        drawBorder: false,
      },
      ticks: {
        color: '#9CA3AF', // text-gray-400
        font: {
          family: 'Inter, system-ui, sans-serif',
          size: 11,
        },
      },
    },
  },
  elements: {
    point: {
      radius: 6,
      hoverRadius: 8,
      borderWidth: 2,
    },
    line: {
      tension: 0.4,
      borderWidth: 3,
    },
    bar: {
      borderRadius: 4,
      borderSkipped: false,
    },
  },
  animation: {
    duration: 800,
    easing: 'easeOutQuart' as const,
  },
}

// Utility functions
export const generateGradient = (ctx: CanvasRenderingContext2D, chartArea: any, colorStart: string, colorEnd: string) => {
  const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top)
  gradient.addColorStop(0, colorStart)
  gradient.addColorStop(1, colorEnd)
  return gradient
}

export const createGlassMorphismBackground = (ctx: CanvasRenderingContext2D, chartArea: any) => {
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
  gradient.addColorStop(0, 'rgba(59, 130, 246, 0.1)')
  gradient.addColorStop(1, 'rgba(30, 64, 175, 0.05)')
  return gradient
}

// Chart-specific configurations
export const barChartOptions = {
  ...defaultChartOptions,
  scales: {
    ...defaultChartOptions.scales,
    x: {
      ...defaultChartOptions.scales.x,
      grid: {
        ...defaultChartOptions.scales.x.grid,
        display: false,
      },
    },
  },
}

export const lineChartOptions = {
  ...defaultChartOptions,
  elements: {
    ...defaultChartOptions.elements,
    point: {
      ...defaultChartOptions.elements.point,
      radius: 4,
      hoverRadius: 6,
    },
  },
}

export const pieChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const,
      labels: {
        color: '#D1D5DB',
        font: {
          family: 'Inter, system-ui, sans-serif',
          size: 12,
        },
        usePointStyle: true,
        padding: 20,
        generateLabels: (chart: any) => {
          const data = chart.data
          if (data.labels.length && data.datasets.length) {
            return data.labels.map((label: string, index: number) => {
              const dataset = data.datasets[0]
              const value = dataset.data[index]
              const total = dataset.data.reduce((sum: number, val: number) => sum + val, 0)
              const percentage = ((value / total) * 100).toFixed(1)
              
              return {
                text: `${label} (${percentage}%)`,
                fillStyle: dataset.backgroundColor[index],
                strokeStyle: dataset.borderColor[index],
                lineWidth: dataset.borderWidth,
                hidden: false,
                index,
              }
            })
          }
          return []
        },
      },
    },
    tooltip: {
      ...defaultChartOptions.plugins?.tooltip,
      callbacks: {
        label: (context: any) => {
          const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0)
          const percentage = ((context.raw / total) * 100).toFixed(1)
          return `${context.label}: ${context.raw} (${percentage}%)`
        },
      },
    },
  },
  animation: {
    duration: 1000,
    easing: 'easeOutQuart' as const,
  },
}

export const scatterChartOptions = {
  ...defaultChartOptions,
  elements: {
    ...defaultChartOptions.elements,
    point: {
      radius: 8,
      hoverRadius: 12,
      borderWidth: 2,
    },
  },
}

// Data processing utilities
export const processRelevanceScores = (papers: any[]) => {
  const scores = papers
    .filter(paper => paper.evaluation?.relevance_score)
    .map(paper => paper.evaluation.relevance_score)
  
  const distribution: { [key: string]: number } = {}
  for (let i = 1; i <= 10; i++) {
    distribution[i.toString()] = 0
  }
  
  scores.forEach(score => {
    const roundedScore = Math.round(score).toString()
    if (distribution[roundedScore] !== undefined) {
      distribution[roundedScore]++
    }
  })
  
  return {
    labels: Object.keys(distribution),
    datasets: [{
      label: 'Number of Papers',
      data: Object.values(distribution),
      backgroundColor: generateGradientArray('#3B82F6', '#1E40AF', 10),
      borderColor: '#3B82F6',
      borderWidth: 2,
      borderRadius: 6,
      borderSkipped: false,
    }]
  }
}

export const processPublicationTimeline = (papers: any[]) => {
  const timeData = papers
    .filter(paper => paper.published)
    .map(paper => {
      const date = new Date(paper.published)
      return {
        date: isNaN(date.getTime()) ? new Date() : date,
        title: paper.title,
        relevance: paper.evaluation?.relevance_score || 0
      }
    })
    .filter(item => !isNaN(item.date.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
  
  // Group by month
  const monthlyData: { [key: string]: number } = {}
  timeData.forEach(item => {
    const monthKey = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, '0')}`
    monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1
  })
  
  return {
    labels: Object.keys(monthlyData),
    datasets: [{
      label: 'Papers Published',
      data: Object.values(monthlyData),
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4,
      borderWidth: 3,
      pointBackgroundColor: '#3B82F6',
      pointBorderColor: '#1E40AF',
      pointHoverBackgroundColor: '#1E40AF',
      pointHoverBorderColor: '#3B82F6',
    }]
  }
}

export const processResearchCategories = (papers: any[]) => {
  const categories: { [key: string]: number } = {}
  
  papers.forEach(paper => {
    // Extract category from arXiv ID (e.g., "2023.12345" -> "cs.AI")
    // For now, we'll use a simplified categorization
    const title = paper.title.toLowerCase()
    let category = 'Other'
    
    if (title.includes('machine learning') || title.includes('ml') || title.includes('neural')) {
      category = 'CS.LG'
    } else if (title.includes('artificial intelligence') || title.includes('ai')) {
      category = 'CS.AI'
    } else if (title.includes('computer vision') || title.includes('cv') || title.includes('image')) {
      category = 'CS.CV'
    } else if (title.includes('natural language') || title.includes('nlp') || title.includes('text')) {
      category = 'CS.CL'
    } else if (title.includes('robotics') || title.includes('robot')) {
      category = 'CS.RO'
    } else if (title.includes('computation') || title.includes('algorithm')) {
      category = 'CS.CC'
    }
    
    categories[category] = (categories[category] || 0) + 1
  })
  
  return {
    labels: Object.keys(categories),
    datasets: [{
      data: Object.values(categories),
      backgroundColor: chartColors.backgroundColors.slice(0, Object.keys(categories).length),
      borderColor: chartColors.borderColors.slice(0, Object.keys(categories).length),
      borderWidth: 2,
    }]
  }
}

// Utility function to generate gradient color arrays
const generateGradientArray = (_startColor: string, _endColor: string, steps: number): string[] => {
  // Simple gradient generation - in a real app you might want to use a color library
  const colors = []
  for (let i = 0; i < steps; i++) {
    const ratio = i / (steps - 1)
    // For simplicity, just use the start color with varying opacity
    colors.push(`rgba(59, 130, 246, ${0.8 - (ratio * 0.3)})`)
  }
  return colors
}