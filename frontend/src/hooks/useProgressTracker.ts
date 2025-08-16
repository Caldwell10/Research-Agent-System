import { useState, useEffect, useCallback, useRef } from 'react'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { ProgressState, ProgressUpdate, ResearchStage, WebSocketProgressMessage } from '@/types/progress'

const RESEARCH_STAGES: ResearchStage[] = [
  {
    id: 'researcher',
    name: 'Research',
    description: 'Finding relevant papers',
    icon: '🔍',
    progressWeight: 30,
    completed: false,
    active: false,
  },
  {
    id: 'analyzer',
    name: 'Analysis',
    description: 'Analyzing paper content',
    icon: '🔬',
    progressWeight: 50,
    completed: false,
    active: false,
  },
  {
    id: 'reporter',
    name: 'Report',
    description: 'Generating final report',
    icon: '📝',
    progressWeight: 20,
    completed: false,
    active: false,
  },
]

const useProgressTracker = () => {
  const { messages, connected } = useWebSocket()
  const [progressState, setProgressState] = useState<ProgressState>({
    currentStage: null,
    overallProgress: 0,
    stageProgress: 0,
    statusMessage: 'Initializing...',
    papers: { found: 0, analyzed: 0, total: 0 },
    startTime: 0,
    isComplete: false,
    hasError: false,
  })
  
  const [stages, setStages] = useState<ResearchStage[]>(RESEARCH_STAGES)
  const startTimeRef = useRef<number>(0)
  const lastProgressUpdateRef = useRef<number>(0)

  const calculateEstimatedTime = useCallback((currentProgress: number, elapsedTime: number): number => {
    if (currentProgress <= 0) return 0
    const totalEstimatedTime = (elapsedTime / currentProgress) * 100
    return Math.max(0, totalEstimatedTime - elapsedTime)
  }, [])

  const updateStageProgress = useCallback((
    stageName: string, 
    message: string, 
    stageProgress?: number,
    papersData?: { found?: number; analyzed?: number; total?: number }
  ) => {
    const currentTime = Date.now()
    const elapsedTime = (currentTime - startTimeRef.current) / 1000

    setStages(prevStages => 
      prevStages.map(stage => ({
        ...stage,
        active: stage.id === stageName || stage.name.toLowerCase() === stageName.toLowerCase(),
        completed: stage.id !== stageName && prevStages.findIndex(s => s.id === stageName) > prevStages.findIndex(s => s.id === stage.id),
        error: false,
      }))
    )

    // Calculate overall progress based on stage completion and current stage progress
    const stageIndex = RESEARCH_STAGES.findIndex(s => 
      s.id === stageName || s.name.toLowerCase() === stageName.toLowerCase()
    )
    
    let overallProgress = 0
    if (stageIndex >= 0) {
      // Add completed stages progress
      for (let i = 0; i < stageIndex; i++) {
        overallProgress += RESEARCH_STAGES[i].progressWeight
      }
      // Add current stage progress
      const currentStageWeight = RESEARCH_STAGES[stageIndex].progressWeight
      const currentStageProgress = stageProgress || 0
      overallProgress += (currentStageWeight * currentStageProgress) / 100
    }

    const estimatedTimeRemaining = calculateEstimatedTime(overallProgress, elapsedTime)

    setProgressState(prev => ({
      ...prev,
      currentStage: (stageName as any) || prev.currentStage,
      overallProgress: Math.min(100, Math.max(0, overallProgress)),
      stageProgress: stageProgress || prev.stageProgress,
      statusMessage: message,
      estimatedTimeRemaining: estimatedTimeRemaining > 0 ? estimatedTimeRemaining : undefined,
      papers: {
        found: papersData?.found || prev.papers.found,
        analyzed: papersData?.analyzed || prev.papers.analyzed,
        total: papersData?.total || papersData?.found || prev.papers.total,
      },
    }))

    lastProgressUpdateRef.current = currentTime
  }, [calculateEstimatedTime])

  const reset = useCallback(() => {
    setProgressState({
      currentStage: null,
      overallProgress: 0,
      stageProgress: 0,
      statusMessage: 'Ready to start research...',
      papers: { found: 0, analyzed: 0, total: 0 },
      startTime: 0,
      isComplete: false,
      hasError: false,
    })
    
    setStages(RESEARCH_STAGES.map(stage => ({
      ...stage,
      completed: false,
      active: false,
      error: false,
    })))
    
    startTimeRef.current = 0
  }, [])

  const start = useCallback((query: string) => {
    startTimeRef.current = Date.now()
    setProgressState(prev => ({
      ...prev,
      currentStage: 'researcher',
      overallProgress: 5,
      stageProgress: 0,
      statusMessage: `Starting research for: "${query}"`,
      startTime: startTimeRef.current,
      isComplete: false,
      hasError: false,
    }))
    
    setStages(prev => prev.map((stage, index) => ({
      ...stage,
      active: index === 0,
      completed: false,
      error: false,
    })))

    // Simulate progress if WebSocket doesn't provide updates
    const simulateProgress = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      
      if (elapsed < 10) { // First 10 seconds - Research stage
        updateStageProgress('researcher', 'Finding relevant papers...', Math.min(90, elapsed * 9), {
          found: Math.floor(elapsed * 2),
          total: Math.floor(elapsed * 2)
        })
      } else if (elapsed < 20) { // Next 10 seconds - Analysis stage
        const analysisProgress = (elapsed - 10) * 9
        updateStageProgress('analyzer', 'Analyzing paper content...', Math.min(90, analysisProgress), {
          found: 10,
          analyzed: Math.floor((elapsed - 10) * 1),
          total: 10
        })
      } else if (elapsed < 25) { // Final 5 seconds - Reporting stage
        const reportProgress = (elapsed - 20) * 18
        updateStageProgress('reporter', 'Generating final report...', Math.min(90, reportProgress))
      }
      
      if (elapsed < 25) {
        setTimeout(simulateProgress, 1000)
      }
    }
    
    // Start simulation after a short delay to allow WebSocket events to take precedence
    setTimeout(() => {
      if (!connected) {
        simulateProgress()
      }
    }, 2000)
  }, [updateStageProgress, connected])

  const complete = useCallback((results: any) => {
    setStages(prev => prev.map(stage => ({
      ...stage,
      completed: true,
      active: false,
    })))
    
    setProgressState(prev => ({
      ...prev,
      currentStage: null,
      overallProgress: 100,
      stageProgress: 100,
      statusMessage: 'Research complete!',
      isComplete: true,
      estimatedTimeRemaining: 0,
    }))
  }, [])

  const error = useCallback((errorMessage: string, stage?: string) => {
    if (stage) {
      setStages(prev => prev.map(s => ({
        ...s,
        error: s.id === stage,
        active: s.id === stage,
      })))
    }
    
    setProgressState(prev => ({
      ...prev,
      hasError: true,
      errorMessage,
      statusMessage: `Error: ${errorMessage}`,
      estimatedTimeRemaining: 0,
    }))
  }, [])

  // Process WebSocket messages
  useEffect(() => {
    if (!messages.length) return

    const latestMessage = messages[messages.length - 1] as WebSocketProgressMessage
    
    try {
      switch (latestMessage.type) {
        case 'research_started':
          if (latestMessage.data?.query) {
            start(latestMessage.data.query)
          }
          break
          
        case 'research_progress':
          const { stage, message } = latestMessage.data
          if (stage && message) {
            // Extract paper numbers from message if available
            const papersFoundMatch = message.match(/(\d+)\s+papers/)
            const papersAnalyzedMatch = message.match(/(\d+)\/(\d+)/)
            
            let papersData: any = {}
            if (papersFoundMatch) {
              papersData.found = parseInt(papersFoundMatch[1])
              papersData.total = parseInt(papersFoundMatch[1])
            }
            if (papersAnalyzedMatch) {
              papersData.analyzed = parseInt(papersAnalyzedMatch[1])
              papersData.total = parseInt(papersAnalyzedMatch[2])
            }
            
            // Calculate stage progress based on paper analysis
            let stageProgress = 0
            if (stage === 'analyzer' && papersAnalyzedMatch) {
              stageProgress = (parseInt(papersAnalyzedMatch[1]) / parseInt(papersAnalyzedMatch[2])) * 100
            }
            
            updateStageProgress(stage, message, stageProgress, papersData)
          }
          break
          
        case 'research_complete':
          complete(latestMessage.data)
          break
          
        case 'error':
          error(latestMessage.data?.error || 'Unknown error occurred')
          break
      }
    } catch (err) {
      console.error('Error processing progress message:', err)
    }
  }, [messages, start, updateStageProgress, complete, error])

  return {
    progressState,
    stages,
    connected,
    start,
    reset,
    complete,
    error,
  }
}

export default useProgressTracker