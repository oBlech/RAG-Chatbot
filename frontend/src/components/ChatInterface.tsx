'use client'

import { useState, useRef, useEffect, FormEvent, ChangeEvent } from 'react'
import axios from 'axios'
import { Send, Bot, User, Loader2, Sparkles, FileText } from 'lucide-react'

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
  const parts = sourceId.split(/[/\\]/)
  return parts[parts.length - 1] || sourceId
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
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 overflow-hidden flex flex-col w-full max-w-5xl mx-auto">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-8 scrollbar-hide flex flex-col">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto min-h-0">
            <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-6 border border-zinc-800 shadow-xl">
              <Bot className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-semibold text-zinc-100 mb-2">How can I help you today?</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Ask questions about your uploaded documents. I'll search your knowledge base and provide cited answers.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${
              msg.role === 'user' 
                ? 'bg-zinc-800 border-zinc-700' 
                : 'bg-indigo-500/10 border-indigo-500/20'
            }`}>
              {msg.role === 'user' ? (
                <User className="w-4 h-4 text-zinc-400" />
              ) : (
                <Bot className="w-4 h-4 text-indigo-400" />
              )}
            </div>
            
            <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-zinc-100 text-zinc-900 rounded-tr-sm'
                    : msg.isError
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20 rounded-tl-sm'
                    : 'bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-tl-sm shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>

              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {msg.sources.map((source, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 bg-zinc-900/50 border border-zinc-800/80 px-2.5 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-colors cursor-default"
                    >
                      <FileText className="w-3.5 h-3.5 opacity-70" />
                      <span className="truncate max-w-[200px]">{getFilename(source)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-sm px-5 py-4 flex flex-col gap-3 min-w-[120px]">
              <div className="flex space-x-1.5 items-center h-4">
                <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 pt-2">
        <form onSubmit={handleSend} className="relative flex items-center bg-zinc-900 border border-zinc-800 focus-within:border-zinc-700 focus-within:ring-1 focus-within:ring-zinc-700 transition-all rounded-xl shadow-sm overflow-hidden">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            placeholder="Message Workspace..."
            className="w-full bg-transparent px-5 py-4 text-[15px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
            disabled={loading}
          />
          <div className="pr-3 flex items-center">
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                input.trim() && !loading
                  ? 'bg-zinc-100 text-zinc-900 hover:bg-white'
                  : 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>
        <p className="text-center text-xs text-zinc-500 mt-3 font-medium">
          RAG may produce inaccurate information about people, places, or facts.
        </p>
      </div>
      </div>
    </div>
  )
}