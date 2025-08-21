import { useCallback } from 'react'
import jsPDF from 'jspdf'
import { ExportOptions, FavoritePaper, SearchHistoryItem } from '@/types/research'
import { ResearchResults } from '@/types/api'

const useAdvancedExport = () => {
  
  // Generate PDF report
  const exportToPDF = useCallback(async (
    data: FavoritePaper[] | SearchHistoryItem[], 
    options: ExportOptions
  ) => {
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 20
    const contentWidth = pageWidth - 2 * margin
    let currentY = margin

    // Helper function to add new page if needed
    const checkPageBreak = (height: number) => {
      if (currentY + height > pageHeight - margin) {
        pdf.addPage()
        currentY = margin
        return true
      }
      return false
    }

    // Helper function to wrap text
    const wrapText = (text: string, maxWidth: number, fontSize: number) => {
      pdf.setFontSize(fontSize)
      return pdf.splitTextToSize(text, maxWidth)
    }

    // Title page
    pdf.setFontSize(24)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Research Report', pageWidth / 2, currentY, { align: 'center' })
    currentY += 20

    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, currentY, { align: 'center' })
    currentY += 10

    if (options.filename) {
      pdf.text(`Report: ${options.filename}`, pageWidth / 2, currentY, { align: 'center' })
      currentY += 15
    }

    // Table of contents
    checkPageBreak(30)
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Table of Contents', margin, currentY)
    currentY += 15

    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    
    if (data.length > 0 && 'title' in data[0]) {
      pdf.text('1. Research Papers ............................ 3', margin, currentY)
      currentY += 8
      pdf.text('2. Summary Statistics ........................ ' + Math.ceil(data.length / 3 + 3), margin, currentY)
    } else {
      pdf.text('1. Search History ............................ 3', margin, currentY)
      currentY += 8
      pdf.text('2. Summary Statistics ........................ ' + Math.ceil(data.length / 5 + 3), margin, currentY)
    }

    // Start content on new page
    pdf.addPage()
    currentY = margin

    if (data.length > 0 && 'title' in data[0]) {
      // Export papers
      const papers = data as FavoritePaper[]
      
      pdf.setFontSize(18)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Research Papers', margin, currentY)
      currentY += 15

      papers.forEach((paper, index) => {
        checkPageBreak(50)

        // Paper number and title
        pdf.setFontSize(14)
        pdf.setFont('helvetica', 'bold')
        const titleLines = wrapText(`${index + 1}. ${paper.title}`, contentWidth, 14)
        titleLines.forEach((line: string) => {
          pdf.text(line, margin, currentY)
          currentY += 6
        })
        currentY += 5

        // Authors
        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'italic')
        const authorText = `Authors: ${paper.authors.join(', ')}`
        const authorLines = wrapText(authorText, contentWidth, 11)
        authorLines.forEach((line: string) => {
          pdf.text(line, margin, currentY)
          currentY += 5
        })
        currentY += 3

        // Publication date and rating
        pdf.setFont('helvetica', 'normal')
        pdf.text(`Published: ${new Date(paper.published).toLocaleDateString()}`, margin, currentY)
        if (paper.custom_rating) {
          pdf.text(`Rating: ${'★'.repeat(paper.custom_rating)}${'☆'.repeat(5 - paper.custom_rating)}`, margin + 80, currentY)
        }
        currentY += 8

        // Abstract (if included)
        if (options.include_abstracts && paper.abstract) {
          pdf.setFontSize(10)
          pdf.setFont('helvetica', 'normal')
          pdf.text('Abstract:', margin, currentY)
          currentY += 5

          const abstractLines = wrapText(paper.abstract, contentWidth, 10)
          abstractLines.forEach((line: string) => {
            checkPageBreak(4)
            pdf.text(line, margin, currentY)
            currentY += 4
          })
          currentY += 5
        }

        // Tags (if included)
        if (options.include_tags && paper.tags.length > 0) {
          pdf.setFontSize(10)
          pdf.setFont('helvetica', 'normal')
          pdf.text(`Tags: ${paper.tags.join(', ')}`, margin, currentY)
          currentY += 5
        }

        // Notes (if included)
        if (options.include_notes && paper.notes) {
          pdf.setFontSize(10)
          pdf.setFont('helvetica', 'italic')
          const notesLines = wrapText(`Notes: ${paper.notes}`, contentWidth, 10)
          notesLines.forEach((line: string) => {
            checkPageBreak(4)
            pdf.text(line, margin, currentY)
            currentY += 4
          })
          currentY += 5
        }

        currentY += 10 // Space between papers
      })

    } else {
      // Export search history
      const searches = data as SearchHistoryItem[]
      
      pdf.setFontSize(18)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Search History', margin, currentY)
      currentY += 15

      searches.forEach((search, index) => {
        checkPageBreak(30)

        // Search query
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.text(`${index + 1}. ${search.query}`, margin, currentY)
        currentY += 8

        // Search details
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'normal')
        pdf.text(`Date: ${new Date(search.timestamp).toLocaleDateString()}`, margin, currentY)
        pdf.text(`Papers Found: ${search.results?.papers_found || 0}`, margin + 80, currentY)
        currentY += 5

        if (search.results?.execution_time) {
          pdf.text(`Execution Time: ${search.results.execution_time.toFixed(1)}s`, margin, currentY)
        }
        pdf.text(`Status: ${search.results?.status || 'pending'}`, margin + 80, currentY)
        currentY += 8

        if (search.starred) {
          pdf.text('★ Starred', margin, currentY)
          currentY += 5
        }

        if (search.tags.length > 0) {
          pdf.text(`Tags: ${search.tags.join(', ')}`, margin, currentY)
          currentY += 5
        }

        currentY += 5
      })
    }

    // Save the PDF
    const filename = options.filename || `research-report-${new Date().toISOString().split('T')[0]}`
    pdf.save(`${filename}.pdf`)
  }, [])

  // Generate Research Results PDF report
  const exportResearchResultsToPDF = useCallback(async (
    results: ResearchResults,
    options: Partial<ExportOptions> = {}
  ) => {
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 20
    const contentWidth = pageWidth - 2 * margin
    let currentY = margin

    // Helper function to add new page if needed
    const checkPageBreak = (height: number) => {
      if (currentY + height > pageHeight - margin) {
        pdf.addPage()
        currentY = margin
        return true
      }
      return false
    }

    // Helper function to wrap text
    const wrapText = (text: string, maxWidth: number, fontSize: number) => {
      pdf.setFontSize(fontSize)
      return pdf.splitTextToSize(text, maxWidth)
    }

    // Title page
    pdf.setFontSize(24)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Research Analysis Report', pageWidth / 2, currentY, { align: 'center' })
    currentY += 20

    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Query: ${results.query}`, pageWidth / 2, currentY, { align: 'center' })
    currentY += 10

    pdf.setFontSize(12)
    pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, currentY, { align: 'center' })
    currentY += 15

    // Status and summary
    if (results.status === 'success') {
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text('✓ Analysis Complete', pageWidth / 2, currentY, { align: 'center' })
      currentY += 15
    }

    // Summary statistics
    if (results.summary) {
      checkPageBreak(40)
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Summary', margin, currentY)
      currentY += 10

      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      
      const summaryItems = [
        `Papers Found: ${results.summary.papers_found}`,
        `Analysis Time: ${results.execution_time_seconds?.toFixed(1)}s`,
        `Key Insights: ${results.summary.key_insights}`,
        `Recommendations: ${results.summary.recommendations}`
      ]

      summaryItems.forEach((item, index) => {
        const x = margin + (index % 2) * (contentWidth / 2)
        const y = currentY + Math.floor(index / 2) * 8
        pdf.text(item, x, y)
      })
      currentY += Math.ceil(summaryItems.length / 2) * 8 + 15
    }

    // Executive Summary
    if (results.report?.executive_summary) {
      checkPageBreak(30)
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Executive Summary', margin, currentY)
      currentY += 10

      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'normal')
      const summaryLines = wrapText(results.report.executive_summary, contentWidth, 11)
      summaryLines.forEach((line: string) => {
        checkPageBreak(5)
        pdf.text(line, margin, currentY)
        currentY += 5
      })
      currentY += 15
    }

    // Key Insights (from analysis results)
    if (results.analysis_results?.insights) {
      const insights = results.analysis_results.insights
      
      checkPageBreak(30)
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Key Insights', margin, currentY)
      currentY += 10

      // Trending Methods
      if (insights.trending_methods?.length > 0) {
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Trending Methods:', margin, currentY)
        currentY += 8

        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'normal')
        insights.trending_methods.forEach((method, index) => {
          checkPageBreak(6)
          pdf.text(`• ${method}`, margin + 5, currentY)
          currentY += 6
        })
        currentY += 8
      }

      // Research Gaps
      if (insights.research_gaps?.length > 0) {
        checkPageBreak(15)
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Research Gaps:', margin, currentY)
        currentY += 8

        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'normal')
        insights.research_gaps.forEach((gap, index) => {
          checkPageBreak(6)
          pdf.text(`• ${gap}`, margin + 5, currentY)
          currentY += 6
        })
        currentY += 8
      }

      // Key Findings
      if (insights.key_findings?.length > 0) {
        checkPageBreak(15)
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Key Findings:', margin, currentY)
        currentY += 8

        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'normal')
        insights.key_findings.forEach((finding, index) => {
          checkPageBreak(6)
          pdf.text(`• ${finding}`, margin + 5, currentY)
          currentY += 6
        })
        currentY += 10
      }
    }

    // Recommendations
    if (results.report?.recommendations && results.report.recommendations.length > 0) {
      checkPageBreak(30)
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Recommendations', margin, currentY)
      currentY += 10

      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'normal')
      results.report.recommendations.forEach((rec, index) => {
        checkPageBreak(8)
        const recLines = wrapText(`${index + 1}. ${rec}`, contentWidth - 10, 11)
        recLines.forEach((line: string, lineIndex: number) => {
          pdf.text(lineIndex === 0 ? line : `    ${line}`, margin + 5, currentY)
          currentY += 5
        })
        currentY += 3
      })
      currentY += 10
    }

    // Technical Analysis
    if (results.analysis_results?.technical_analysis) {
      const tech = results.analysis_results.technical_analysis
      
      checkPageBreak(30)
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Technical Analysis', margin, currentY)
      currentY += 15

      if (tech.datasets_used?.length > 0) {
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Datasets Used:', margin, currentY)
        currentY += 8

        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'normal')
        tech.datasets_used.forEach((dataset) => {
          checkPageBreak(6)
          pdf.text(`• ${dataset}`, margin + 5, currentY)
          currentY += 6
        })
        currentY += 8
      }

      if (tech.evaluation_metrics?.length > 0) {
        checkPageBreak(15)
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Evaluation Metrics:', margin, currentY)
        currentY += 8

        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'normal')
        tech.evaluation_metrics.forEach((metric) => {
          checkPageBreak(6)
          pdf.text(`• ${metric}`, margin + 5, currentY)
          currentY += 6
        })
        currentY += 10
      }
    }

    // Papers Analyzed
    if (results.research_results?.papers && results.research_results.papers.length > 0) {
      checkPageBreak(30)
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Papers Analyzed', margin, currentY)
      currentY += 15

      results.research_results.papers.forEach((paper, index) => {
        checkPageBreak(40)

        // Paper title
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        const titleLines = wrapText(`${index + 1}. ${paper.title}`, contentWidth, 12)
        titleLines.forEach((line: string) => {
          pdf.text(line, margin, currentY)
          currentY += 6
        })
        currentY += 5

        // Authors
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'italic')
        const authorText = `Authors: ${paper.authors.slice(0, 3).join(', ')}${paper.authors.length > 3 ? ' et al.' : ''}`
        pdf.text(authorText, margin, currentY)
        currentY += 6

        // Publication date and relevance score
        pdf.setFont('helvetica', 'normal')
        pdf.text(`Published: ${paper.published}`, margin, currentY)
        if (paper.evaluation?.relevance_score) {
          pdf.text(`Relevance: ${paper.evaluation.relevance_score}/10`, margin + 80, currentY)
        }
        currentY += 8

        // Abstract (abbreviated)
        if (paper.abstract) {
          pdf.setFontSize(9)
          const abstractText = paper.abstract.length > 300 
            ? paper.abstract.substring(0, 300) + '...' 
            : paper.abstract
          const abstractLines = wrapText(`Abstract: ${abstractText}`, contentWidth, 9)
          abstractLines.slice(0, 3).forEach((line: string) => { // Limit to 3 lines
            checkPageBreak(4)
            pdf.text(line, margin, currentY)
            currentY += 4
          })
          currentY += 8
        }

        // Key contributions (if available)
        if (paper.evaluation?.key_contributions && paper.evaluation.key_contributions.length > 0) {
          pdf.setFontSize(9)
          pdf.setFont('helvetica', 'bold')
          pdf.text('Key Contributions:', margin, currentY)
          currentY += 5

          pdf.setFont('helvetica', 'normal')
          paper.evaluation.key_contributions.slice(0, 2).forEach((contribution) => {
            checkPageBreak(4)
            const contribLines = wrapText(`• ${contribution}`, contentWidth - 10, 9)
            contribLines.slice(0, 2).forEach((line: string) => {
              pdf.text(line, margin + 5, currentY)
              currentY += 4
            })
          })
          currentY += 5
        }

        currentY += 10 // Space between papers
      })
    }

    // Footer with metadata
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    const totalPages = pdf.internal.pages.length - 1
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i)
      pdf.text(
        `Page ${i} of ${totalPages} | Generated by Multi-Agent Research Tool`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      )
    }

    // Save the PDF
    const filename = options.filename || `research-report-${results.query.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}`
    pdf.save(`${filename}.pdf`)
  }, [])

  // Generate Excel/CSV export
  const exportToSpreadsheet = useCallback((
    data: FavoritePaper[] | SearchHistoryItem[],
    options: ExportOptions
  ) => {
    let csvContent = ''
    
    if (data.length > 0 && 'title' in data[0]) {
      // Export papers
      const papers = data as FavoritePaper[]
      const headers = [
        'Title',
        'Authors',
        'Published',
        'Relevance Score',
        'Custom Rating',
        'Collections',
        'Tags',
        ...(options.include_abstracts ? ['Abstract'] : []),
        ...(options.include_notes ? ['Notes'] : [])
      ]

      const rows = papers.map(paper => [
        paper.title,
        paper.authors.join('; '),
        paper.published,
        paper.relevance_score || '',
        paper.custom_rating || '',
        paper.collections.join('; '),
        paper.tags.join('; '),
        ...(options.include_abstracts ? [paper.abstract] : []),
        ...(options.include_notes ? [paper.notes || ''] : [])
      ])

      csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')

    } else {
      // Export search history
      const searches = data as SearchHistoryItem[]
      const headers = [
        'Query',
        'Date',
        'Papers Found',
        'Execution Time',
        'Status',
        'Starred',
        'Tags',
        'Notes'
      ]

      const rows = searches.map(search => [
        search.query,
        new Date(search.timestamp).toLocaleDateString(),
        search.results?.papers_found || 0,
        search.results?.execution_time || 0,
        search.results?.status || 'pending',
        search.starred ? 'Yes' : 'No',
        search.tags.join('; '),
        search.notes || ''
      ])

      csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')
    }

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    
    const filename = options.filename || `research-data-${new Date().toISOString().split('T')[0]}`
    const extension = options.format === 'excel' ? '.csv' : '.csv' // Excel export would need additional library
    link.setAttribute('download', `${filename}${extension}`)
    
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  // Generate BibTeX export
  const exportToBibTeX = useCallback((papers: FavoritePaper[], options: ExportOptions) => {
    const bibtexEntries = papers.map((paper, index) => {
      const authors = paper.authors.join(' and ')
      const year = new Date(paper.published).getFullYear()
      const key = paper.arxiv_id || `paper${index + 1}`
      
      let entry = `@article{${key},\n`
      entry += `  title={${paper.title}},\n`
      entry += `  author={${authors}},\n`
      entry += `  year={${year}},\n`
      entry += `  journal={arXiv preprint}`
      
      if (paper.arxiv_id) {
        entry += `,\n  arxiv={${paper.arxiv_id}}`
      }
      
      if (paper.pdf_url) {
        entry += `,\n  url={${paper.pdf_url}}`
      }
      
      if (options.include_notes && paper.notes) {
        entry += `,\n  note={${paper.notes}}`
      }
      
      if (options.include_abstracts && paper.abstract) {
        entry += `,\n  abstract={${paper.abstract.replace(/\n/g, ' ')}}`
      }
      
      entry += '\n}'
      return entry
    }).join('\n\n')

    // Download BibTeX
    const blob = new Blob([bibtexEntries], { type: 'text/plain;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    
    const filename = options.filename || `research-bibliography-${new Date().toISOString().split('T')[0]}`
    link.setAttribute('download', `${filename}.bib`)
    
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  // Generate Word document (simplified version)
  const exportToWord = useCallback((papers: FavoritePaper[], options: ExportOptions) => {
    let wordContent = `<html><head><meta charset="utf-8"><title>Research Report</title></head><body>`
    
    // Title
    wordContent += `<h1 style="text-align: center; color: #1e40af;">Research Report</h1>`
    wordContent += `<p style="text-align: center; color: #666;">Generated on ${new Date().toLocaleDateString()}</p>`
    wordContent += `<hr style="margin: 20px 0;">`
    
    // Papers
    papers.forEach((paper, index) => {
      wordContent += `<h2 style="color: #3b82f6; margin-top: 30px;">${index + 1}. ${paper.title}</h2>`
      wordContent += `<p style="font-style: italic; color: #666;"><strong>Authors:</strong> ${paper.authors.join(', ')}</p>`
      wordContent += `<p style="color: #666;"><strong>Published:</strong> ${new Date(paper.published).toLocaleDateString()}</p>`
      
      if (paper.custom_rating) {
        const stars = '★'.repeat(paper.custom_rating) + '☆'.repeat(5 - paper.custom_rating)
        wordContent += `<p style="color: #f59e0b;"><strong>Rating:</strong> ${stars}</p>`
      }
      
      if (options.include_abstracts && paper.abstract) {
        wordContent += `<h3 style="color: #374151;">Abstract</h3>`
        wordContent += `<p style="text-align: justify; line-height: 1.6;">${paper.abstract}</p>`
      }
      
      if (options.include_tags && paper.tags.length > 0) {
        wordContent += `<p><strong>Tags:</strong> ${paper.tags.map(tag => `<span style="background: #e5e7eb; padding: 2px 6px; border-radius: 3px; margin-right: 5px;">${tag}</span>`).join('')}</p>`
      }
      
      if (options.include_notes && paper.notes) {
        wordContent += `<h3 style="color: #374151;">Notes</h3>`
        wordContent += `<p style="font-style: italic; background: #f9fafb; padding: 10px; border-left: 4px solid #3b82f6;">${paper.notes}</p>`
      }
      
      wordContent += `<hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">`
    })
    
    wordContent += `</body></html>`
    
    // Download as HTML (can be opened in Word)
    const blob = new Blob([wordContent], { type: 'text/html;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    
    const filename = options.filename || `research-report-${new Date().toISOString().split('T')[0]}`
    link.setAttribute('download', `${filename}.html`)
    
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  // Generate JSON export
  const exportToJSON = useCallback((data: any, options: ExportOptions) => {
    const exportData = {
      metadata: {
        export_date: new Date().toISOString(),
        export_type: options.format,
        filename: options.filename,
        total_items: data.length,
      },
      data: data,
      ...(options.include_notes ? { notes_included: true } : {}),
      ...(options.include_tags ? { tags_included: true } : {}),
      ...(options.include_abstracts ? { abstracts_included: true } : {}),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json;charset=utf-8;' 
    })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    
    const filename = options.filename || `research-data-${new Date().toISOString().split('T')[0]}`
    link.setAttribute('download', `${filename}.json`)
    
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  // Main export function
  const exportData = useCallback(async (
    data: FavoritePaper[] | SearchHistoryItem[],
    options: ExportOptions
  ) => {
    try {
      switch (options.format) {
        case 'pdf':
          await exportToPDF(data, options)
          break
        case 'csv':
        case 'excel':
          exportToSpreadsheet(data, options)
          break
        case 'bibtex':
          if (data.length > 0 && 'title' in data[0]) {
            exportToBibTeX(data as FavoritePaper[], options)
          } else {
            throw new Error('BibTeX export only supports papers')
          }
          break
        case 'word':
          if (data.length > 0 && 'title' in data[0]) {
            exportToWord(data as FavoritePaper[], options)
          } else {
            throw new Error('Word export only supports papers')
          }
          break
        case 'json':
          exportToJSON(data, options)
          break
        default:
          throw new Error(`Unsupported export format: ${options.format}`)
      }
      return true
    } catch (error) {
      console.error('Export error:', error)
      throw error
    }
  }, [exportToPDF, exportToSpreadsheet, exportToBibTeX, exportToWord, exportToJSON])

  return {
    exportData,
    exportToPDF,
    exportResearchResultsToPDF,
    exportToSpreadsheet,
    exportToBibTeX,
    exportToWord,
    exportToJSON,
  }
}

export default useAdvancedExport