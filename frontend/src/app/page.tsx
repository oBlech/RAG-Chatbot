'use client'

import { useState } from 'react'
import ChatInterface from '../components/ChatInterface'
import AdminPanel from '../components/AdminPanel'

type TabType = 'chat' | 'admin'

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('chat')

  return (
    <div className="min-h-screen bg-[#2d2d2d]">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="backdrop-blur-xl bg-white/10 rounded-xl shadow-2xl overflow-hidden border border-white/20">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500/90 to-amber-500/90 backdrop-blur-sm px-6 py-4 border-b border-white/10">
            <h1 className="text-3xl font-bold text-white">Blech's RAG</h1>
            <p className="text-orange-100 mt-1">Ask away.</p>
          </div>

          {/* Tabs */}
          <div className="border-b border-white/10 bg-white/5">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-6 py-4 font-medium text-sm transition-colors ${
                  activeTab === 'chat'
                    ? 'text-white border-b-2 border-orange-400'
                    : 'text-gray-400 hover:text-white hover:border-white/20'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-6 py-4 font-medium text-sm transition-colors ${
                  activeTab === 'admin'
                    ? 'text-white border-b-2 border-orange-400'
                    : 'text-gray-400 hover:text-white hover:border-white/20'
                }`}
              >
                Admin Panel
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="p-6 bg-white/5">
            {activeTab === 'chat' ? <ChatInterface /> : <AdminPanel />}
          </div>
        </div>
      </div>
    </div>
  )
}
