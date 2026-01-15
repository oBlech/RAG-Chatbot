'use client'

import { useState, useRef, useEffect, FormEvent, ChangeEvent } from 'react'
import axios from 'axios'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
  isError?: boolean
}

interface QueryResponse {
  answer: string
  sources: string[]
  num_contexts: number
}

function getFilename(sourceId: string): string {
  // Extract just the filename from path (handles both / and \ separators)
  const parts = sourceId.split(/[/\\]/)
  return parts[parts.length - 1] || sourceId
}

function SpeechBubbleIcon() {
  return (
    <svg 
      width="64" 
      height="64" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className="text-gray-400"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!loading) {
      // Small delay to ensure the input is enabled after state update
      setTimeout(() => {
        inputRef.current?.focus()
      }, 0)
    }
  }, [loading])

  const handleSend = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    const currentInput = input
    setInput('')
    setLoading(true)

    try {
      const response = await axios.post<QueryResponse>('/api/query', {
        question: currentInput,
        top_k: 5
      })

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.answer,
        sources: response.data.sources
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${axios.isAxiosError(error) ? (error.response?.data?.detail || error.message) : 'An unexpected error occurred'}`,
        isError: true
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-300px)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <div className="flex justify-center mb-4">
              <SpeechBubbleIcon />
            </div>
            <p className="text-xl font-medium text-white">Start a conversation</p>
            <p className="text-sm mt-2">Ask questions about your documents</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-lg px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                  : msg.isError
                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                  : 'bg-white/10 text-white backdrop-blur-sm border border-white/20'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/20">
                  <div className="text-xs font-semibold text-gray-300 mb-1">Sources:</div>
                  <div className="flex flex-wrap gap-1">
                    {msg.sources.map((source, i) => (
                      <span
                        key={i}
                        className="inline-block bg-white/10 text-gray-300 px-2 py-1 rounded text-xs border border-white/10"
                      >
                        {getFilename(source)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/20">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          placeholder="Ask a question about your documents..."
          className="flex-1 px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-gray-400"
          disabled={loading}
          ref={inputRef}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors font-medium shadow-lg hover:shadow-xl disabled:shadow-none"
        >
          Send
        </button>
      </form>
    </div>
  )
}
