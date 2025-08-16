import React from 'react'
import SearchHistoryPanel from '@/components/SearchHistoryPanel'
import { useNavigate } from 'react-router-dom'

const HistoryPage: React.FC = () => {
  const navigate = useNavigate()

  const handleRunSearch = (query: string, maxPapers: number) => {
    // Navigate to research page with the query parameters
    navigate('/research', { 
      state: { 
        query, 
        maxPapers 
      } 
    })
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Search History</h1>
        <p className="text-muted-foreground">
          Track and manage your research search history. Re-run previous searches or export your data.
        </p>
      </div>

      <SearchHistoryPanel 
        onRunSearch={handleRunSearch}
        className="w-full"
      />
    </div>
  )
}

export default HistoryPage