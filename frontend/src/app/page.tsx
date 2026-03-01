'use client'

import { useState } from 'react'
import ChatInterface from '../components/ChatInterface'
import AdminPanel from '../components/AdminPanel'
import { MessageSquare, Database, BrainCircuit } from 'lucide-react'

type TabType = 'chat' | 'admin'

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('chat')

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-950/50 backdrop-blur-xl flex flex-col">
        <div className="flex items-center gap-3 p-6 pb-8 border-b border-zinc-800/50">
          <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
            <BrainCircuit className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-zinc-100">Blech's RAG</h1>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Enterprise Search</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          <button
            onClick={() => setActiveTab('chat')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium outline-none ${
              activeTab === 'chat'
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Workspace
          </button>
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
        
        <div className="p-4 border-t border-zinc-800/50">
          <div className="flex items-center px-3 py-2 text-sm text-zinc-500">
            <span>v1.0.0</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col min-w-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="relative flex-1 flex flex-col h-full z-10">
          {activeTab === 'chat' ? <ChatInterface /> : <AdminPanel />}
        </div>
      </main>
    </div>
  )
}