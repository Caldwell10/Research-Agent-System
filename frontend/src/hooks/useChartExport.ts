import { useCallback } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface ExportOptions {
  filename?: string
  format?: 'png' | 'svg' | 'pdf'
  quality?: number
}

const useChartExport = () => {
  const exportChartAsPNG = useCallback(async (
    chartRef: React.RefObject<HTMLDivElement>,
    options: ExportOptions = {}
  ) => {
    if (!chartRef.current) return

    const { filename = 'chart', quality = 2 } = options

    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#111827', // gray-900
        scale: quality,
        useCORS: true,
      })

      const link = document.createElement('a')
      link.download = `${filename}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Error exporting chart as PNG:', error)
    }
  }, [])

  const exportChartAsPDF = useCallback(async (
    chartRef: React.RefObject<HTMLDivElement>,
    options: ExportOptions = {}
  ) => {
    if (!chartRef.current) return

    const { filename = 'chart', quality = 2 } = options

    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#111827',
        scale: quality,
        useCORS: true,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
      const imgX = (pdfWidth - imgWidth * ratio) / 2
      const imgY = 30

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio)
      pdf.save(`${filename}.pdf`)
    } catch (error) {
      console.error('Error exporting chart as PDF:', error)
    }
  }, [])

  const exportDataAsCSV = useCallback((data: any[], filename: string = 'data') => {
    if (!data.length) return

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header]
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value
      }).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  const exportDataAsJSON = useCallback((data: any[], filename: string = 'data') => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json;charset=utf-8;' 
    })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.json`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  return {
    exportChartAsPNG,
    exportChartAsPDF,
    exportDataAsCSV,
    exportDataAsJSON,
  }
}

export default useChartExport