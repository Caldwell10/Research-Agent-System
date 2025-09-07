import React from 'react'
const { createContext, useContext, useEffect, useState, useCallback } = React
import { io, Socket } from 'socket.io-client'
import { WebSocketMessage } from '@/types/api'

interface WebSocketContextType {
  socket: Socket | null
  connected: boolean
  messages: WebSocketMessage[]
  sendMessage: (message: any) => void
  clearMessages: () => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}

interface WebSocketProviderProps {
  children: React.ReactNode
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState<WebSocketMessage[]>([])

  useEffect(() => {
    const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:8000'
    const socketInstance = io(WS_URL, {
      transports: ['polling', 'websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socketInstance.on('connect', () => {
      console.log('Connected to Socket.IO server')
      setConnected(true)
    })

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server')
      setConnected(false)
    })

    socketInstance.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error)
      setConnected(false)
    })

    // Handle all message events from Socket.IO
    socketInstance.on('message', (data: any) => {
      console.log('Received Socket.IO message:', data)
      
      // Handle both direct messages and wrapped messages
      const messageData = data.data ? data : { data }
      const message: WebSocketMessage = {
        type: data.type || messageData.type || 'message',
        data: messageData.data || messageData,
        timestamp: data.timestamp || new Date().toISOString(),
      }
      
      setMessages(prev => {
        // Avoid duplicate messages
        const isDuplicate = prev.some(msg => 
          msg.timestamp === message.timestamp && 
          msg.type === message.type &&
          JSON.stringify(msg.data) === JSON.stringify(message.data)
        )
        
        if (isDuplicate) return prev
        
        // Keep only last 50 messages to prevent memory issues
        const newMessages = [...prev, message]
        return newMessages.length > 50 ? newMessages.slice(-50) : newMessages
      })
    })

    // Handle specific research events
    socketInstance.on('research_started', (data: any) => {
      console.log('Research started:', data)
      const message: WebSocketMessage = {
        type: 'research_started',
        data,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, message])
    })

    socketInstance.on('research_progress', (data: any) => {
      console.log('Research progress:', data)
      const message: WebSocketMessage = {
        type: 'research_progress',
        data,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, message])
    })

    socketInstance.on('research_complete', (data: any) => {
      console.log('Research complete:', data)
      const message: WebSocketMessage = {
        type: 'research_complete',
        data,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, message])
    })

    socketInstance.on('error', (error: any) => {
      console.error('Socket.IO error:', error)
      const message: WebSocketMessage = {
        type: 'error',
        data: { error: error.message || error },
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, message])
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [])

  const sendMessage = useCallback((message: any) => {
    if (socket && connected) {
      socket.emit('message', message)
    } else {
      console.warn('Cannot send message: WebSocket not connected')
    }
  }, [socket, connected])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return (
    <WebSocketContext.Provider
      value={{
        socket,
        connected,
        messages,
        sendMessage,
        clearMessages,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}