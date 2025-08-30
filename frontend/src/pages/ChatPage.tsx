import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { 
  MessageCircle, 
  Send, 
  User, 
  Bot, 
  FileText,
  Search,
  Clock,
  Database,
  Loader2,
  ExternalLink,
  Plus,
  Trash2
} from 'lucide-react'

interface Message {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  citations?: Citation[]
  isLoading?: boolean
}

interface Citation {
  title: string
  authors: string[]
  score: number
  paper_id: string
}

interface KnowledgeBaseStats {
  total_chunks: number
  unique_papers: number
  sources: Record<string, number>
  is_synced: boolean
}

const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'system',
      content: 'Hey there! I\'m your research assistant 👋 I love diving into academic papers to find you the most accurate and up-to-date information. Ask me anything, or use the + button to research a specific topic first - I\'m here to help! 😊',
      timestamp: new Date(),
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isResearching, setIsResearching] = useState(false)
  const [knowledgeBaseStats, setKnowledgeBaseStats] = useState<KnowledgeBaseStats | null>(null)
  const [researchTopic, setResearchTopic] = useState('')
  const [showResearchInput, setShowResearchInput] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load knowledge base stats on mount
  useEffect(() => {
    loadKnowledgeBaseStats()
  }, [])

  const loadKnowledgeBaseStats = async () => {
    try {
      const response = await fetch('/api/rag/stats')
      const data = await response.json()
      if (data.status === 'success') {
        setKnowledgeBaseStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to load knowledge base stats:', error)
    }
  }

  const sendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    }

    // Add user message and clear input immediately
    setMessages(prev => [...prev, userMessage])
    const currentInput = inputValue
    setInputValue('')

    // Add loading message
    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: 'Searching through research papers...',
      timestamp: new Date(),
      isLoading: true,
    }
    setMessages(prev => [...prev, loadingMessage])

    try {
      const response = await fetch('/api/rag/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: currentInput,
          research_topic: showResearchInput && researchTopic ? researchTopic : undefined,
        }),
      })

      const data = await response.json()

      // Remove loading message and add real response
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== loadingMessage.id)
        const assistantMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'assistant',
          content: data.response || 'Sorry, I encountered an error processing your request.',
          timestamp: new Date(),
          citations: data.referenced_papers?.map((paper: any) => ({
            title: paper.title,
            authors: paper.authors || [],
            score: paper.relevance_score || 0,
            paper_id: paper.paper_id,
          })),
        }
        return [...filtered, assistantMessage]
      })

      // Update knowledge base stats
      if (data.knowledge_base_stats) {
        setKnowledgeBaseStats(data.knowledge_base_stats)
      }

      // Reset research topic input
      if (showResearchInput) {
        setResearchTopic('')
        setShowResearchInput(false)
      }

    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== loadingMessage.id)
        const errorMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        }
        return [...filtered, errorMessage]
      })
    } finally {
      // No need to block UI anymore
    }
  }

  const clearChat = () => {
    setMessages([{
      id: '1',
      type: 'system',
      content: 'Fresh start! I\'m ready to help you explore any research topic. What would you like to dive into today? 🚀',
      timestamp: new Date(),
    }])
  }

  const researchTopicOnly = async () => {
    if (!researchTopic.trim() || isResearching) return

    // Set researching state to prevent duplicate requests
    setIsResearching(true)

    // Add friendly research status message
    const researchMessage: Message = {
      id: Date.now().toString(),
      type: 'system',
      content: `Hey! I'm diving into research about "${researchTopic}" right now. This might take a moment, but feel free to keep chatting with me! 😊`,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, researchMessage])

    try {
      const response = await fetch('/api/rag/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: `Research completed for topic: ${researchTopic}`,
          research_topic: researchTopic,
        }),
      })

      const data = await response.json()

      // Add warm completion message
      setMessages(prev => {
        const completionMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'system',
          content: `Perfect! I've just finished gathering some amazing research papers about "${researchTopic}" and added them to my knowledge base. Now I can give you much more detailed and accurate answers about this topic! What would you like to know? 🎉`,
          timestamp: new Date(),
        }
        return [...prev, completionMessage]
      })

      // Update knowledge base stats
      if (data.knowledge_base_stats) {
        setKnowledgeBaseStats(data.knowledge_base_stats)
      }

      // Clear research topic
      setResearchTopic('')

    } catch (error) {
      console.error('Research error:', error)
      setMessages(prev => {
        const errorMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'system',
          content: `Oops! I ran into a little hiccup while researching "${researchTopic}". No worries though - let me try that again for you! 😅`,
          timestamp: new Date(),
        }
        return [...prev, errorMessage]
      })
    } finally {
      setIsResearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header with Knowledge Base Stats */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h1 className="font-semibold text-lg">Research Chat</h1>
          </div>
          
          {knowledgeBaseStats && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Database className="w-4 h-4" />
                <span>{knowledgeBaseStats.total_chunks} chunks</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                <span>{knowledgeBaseStats.unique_papers} papers</span>
              </div>
              <button
                onClick={clearChat}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3 max-w-4xl",
              message.type === 'user' && "ml-auto flex-row-reverse",
              message.type === 'system' && "justify-center"
            )}
          >
            {/* Avatar */}
            {message.type !== 'system' && (
              <div className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                message.type === 'user' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              )}>
                {message.type === 'user' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>
            )}

            {/* Message Content */}
            <div className={cn(
              "flex-1 space-y-2",
              message.type === 'user' && "text-right",
              message.type === 'system' && "text-center max-w-md mx-auto"
            )}>
              <div className={cn(
                "rounded-2xl px-4 py-3 prose prose-sm max-w-none",
                message.type === 'user' && "bg-primary text-primary-foreground ml-auto inline-block",
                message.type === 'assistant' && "bg-muted text-foreground",
                message.type === 'system' && "bg-muted/50 text-muted-foreground italic text-center"
              )}>
                {message.isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{message.content}</span>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                )}
              </div>

              {/* Citations */}
              {message.citations && message.citations.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground font-medium">
                    Referenced Papers:
                  </div>
                  <div className="space-y-1">
                    {message.citations.slice(0, 3).map((citation, idx) => (
                      <div
                        key={idx}
                        className="text-xs bg-background/50 rounded-lg p-2 border border-border"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground truncate">
                              {citation.title}
                            </div>
                            <div className="text-muted-foreground">
                              {citation.authors.slice(0, 2).join(', ')}
                              {citation.authors.length > 2 && ` +${citation.authors.length - 2} more`}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>{(citation.score * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className={cn(
                "text-xs text-muted-foreground flex items-center gap-1",
                message.type === 'user' && "justify-end",
                message.type === 'system' && "justify-center"
              )}>
                <Clock className="w-3 h-3" />
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card/50 backdrop-blur-sm p-4">
        {/* Research Topic Input */}
        {showResearchInput && (
          <div className="mb-3 p-3 bg-muted/50 rounded-lg border border-dashed border-border">
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Research Topic (Optional)</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={researchTopic}
                onChange={(e) => setResearchTopic(e.target.value)}
                placeholder="e.g., quantum computing, machine learning..."
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                onKeyPress={(e) => e.key === 'Enter' && researchTopicOnly()}
              />
              <button
                onClick={researchTopicOnly}
                disabled={!researchTopic.trim() || isResearching}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  researchTopic.trim() && !isResearching
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isResearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Research this topic to add papers to knowledge base, then ask questions about it.
            </p>
          </div>
        )}

        {/* Main Input */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowResearchInput(!showResearchInput)}
            className={cn(
              "flex-shrink-0 p-2 rounded-lg transition-all duration-200",
              showResearchInput 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
            title="Research new topic"
          >
            <Plus className={cn("w-5 h-5 transition-transform", showResearchInput && "rotate-45")} />
          </button>
          
          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about any research topic..."
              className="w-full bg-background border border-border rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none max-h-32 min-h-[48px]"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                inputValue.trim() && !isLoading
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Helper Text */}
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}

export default ChatPage