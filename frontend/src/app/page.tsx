'use client'

import { useState, useEffect } from 'react'
import ChatInterface from '../components/ChatInterface'
import AdminPanel from '../components/AdminPanel'
import { MessageSquare, Database, BrainCircuit, Plus, Trash2 } from 'lucide-react'

type TabType = 'chat' | 'admin'

export interface ChatSession {
  id: string
  title: string
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('chat')
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    const savedSessions = localStorage.getItem('rag_sessions_list')
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions)
        setSessions(parsed)
        if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id)
        }
      } catch (e) {
        console.error("Failed to load sessions", e)
      }
    }
    setHasLoaded(true)
  }, [])

  useEffect(() => {
    if (!hasLoaded) return
    if (sessions.length > 0) {
      localStorage.setItem('rag_sessions_list', JSON.stringify(sessions))
    } else {
      localStorage.removeItem('rag_sessions_list')
    }
  }, [sessions, hasLoaded])

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat'
    }
    setSessions(prev => [newSession, ...prev])
    setActiveSessionId(newSession.id)
    setActiveTab('chat')
  }

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm("Delete this chat?")) return
    
    setSessions(prev => prev.filter(s => s.id !== id))
    localStorage.removeItem(`rag_chat_history_${id}`)
    
    if (activeSessionId === id) {
      setActiveSessionId(null)
    }
  }

  const updateSessionTitle = (id: string, newTitle: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s))
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-950/50 backdrop-blur-xl flex flex-col">
        <div className="flex items-center gap-3 p-6 pb-6 border-b border-zinc-800/50">
          <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
            <BrainCircuit className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-zinc-100">Blech's RAG</h1>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Enterprise Search</p>
          </div>
        </div>

        <nav className="p-3 space-y-1 border-b border-zinc-800/50">
          <button
            onClick={() => setActiveTab('admin')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium outline-none ${
              activeTab === 'admin'
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <Database className="w-4 h-4" />
            Knowledge Base
          </button>
        </nav>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-hide">
          <button
            onClick={createNewSession}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium outline-none text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent mb-2 group"
          >
            <div className="flex items-center gap-3">
              <Plus className="w-4 h-4" />
              New Chat
            </div>
          </button>

          {sessions.length > 0 && (
            <>
              <div className="text-xs font-medium text-zinc-500 px-3 py-2 mt-4 mb-1">
                Recent Chats
              </div>

              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => {
                    setActiveSessionId(session.id)
                    setActiveTab('chat')
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium outline-none group ${
                    activeTab === 'chat' && activeSessionId === session.id
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden flex-1">
                    <MessageSquare className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{session.title}</span>
                  </div>
                  <Trash2 
                    onClick={(e) => deleteSession(e, session.id)}
                    className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-red-400" 
                  />
                </button>
              ))}
            </>
          )}
        </div>
        
        <div className="p-4 border-t border-zinc-800/50 mt-auto">
          <div className="flex items-center px-3 py-2 text-sm text-zinc-500">
            <span>v1.0.0</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col min-w-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="relative flex-1 flex flex-col h-full z-10">
          {!hasLoaded ? null : activeTab === 'chat' ? (
            activeSessionId ? (
              <ChatInterface 
                key={activeSessionId} 
                sessionId={activeSessionId} 
                onUpdateTitle={(title) => updateSessionTitle(activeSessionId, title)}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                 <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mb-8 border border-indigo-500/20 shadow-2xl">
                    <BrainCircuit className="w-10 h-10 text-indigo-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-zinc-100 mb-4 tracking-tight">Welcome to your Workspace</h2>
                  <p className="text-zinc-400 max-w-md mx-auto text-lg leading-relaxed mb-10">
                    Start a new conversation to search across your PDF and spreadsheet documents with AI.
                  </p>
                  <button 
                    onClick={createNewSession}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Start New Chat
                  </button>
              </div>
            )
          ) : activeTab === 'admin' ? (
            <AdminPanel />
          ) : null}
        </div>
      </main>
    </div>
  )
}