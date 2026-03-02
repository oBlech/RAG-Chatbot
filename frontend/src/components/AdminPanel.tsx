'use client'

import { useState, useEffect, useRef, ChangeEvent } from 'react'
import axios from 'axios'
import { UploadCloud, Trash2, FileText, Loader2, AlertCircle, CheckCircle2, Search, ArrowUpDown } from 'lucide-react'

interface Document {
  source_id: string
}

interface UploadResponse {
  message: string
  chunks_ingested: number
  source_id: string
}

interface UploadStatus {
  type: 'success' | 'error'
  message: string
}

function getFilename(sourceId: string): string {
  const parts = sourceId.split(/[/\\]/)
  return parts[parts.length - 1] || sourceId
}

function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

function getFilenameWithoutExtension(sourceId: string): string {
  const filename = getFilename(sourceId)
  return filename.replace(/\.[^/.]+$/, "")
}

function FileTypeBadge({ extension }: { extension: string }) {
  const ext = extension.toUpperCase()
  if (!ext) return null
  
  const colors: Record<string, string> = {
    'PDF': 'bg-red-500/10 text-red-400 border-red-500/20',
    'CSV': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'XLSX': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'XLS': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  }

  const colorClass = colors[ext] || 'bg-zinc-800 text-zinc-400 border-zinc-700/50'

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${colorClass}`}>
      {ext}
    </span>
  )
}

export default function AdminPanel() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [uploading, setUploading] = useState<boolean>(false)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null)
  const [dragActive, setDragActive] = useState<boolean>(false)
  
  // Search and Sort State
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortBy, setSortBy] = useState<'name' | 'type'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    setLoading(true)
    try {
      const response = await axios.get<Document[]>('/api/documents')
      setDocuments(response.data)
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFile = async (selectedFile: File) => {
    const validExtensions = ['.pdf', '.csv', '.xlsx', '.xls'];
    const hasValidExtension = validExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext));

    if (!hasValidExtension) {
      setUploadStatus({ type: 'error', message: 'Please select a valid PDF, CSV, or Excel file' })
      return
    }

    setUploading(true)
    setUploadStatus(null)

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const response = await axios.post<UploadResponse>('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUploadStatus({
        type: 'success',
        message: `Successfully indexed "${response.data.source_id}" (${response.data.chunks_ingested} chunks)`,
      })
      loadDocuments()
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: axios.isAxiosError(error) ? (error.response?.data?.detail || error.message) : 'An unexpected error occurred',
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) await handleFile(selectedFile)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFile(e.dataTransfer.files[0])
    }
  }

  const handleDelete = async (sourceId: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${getFilename(sourceId)}"?`)) return

    try {
      await axios.delete(`/api/documents/${encodeURIComponent(sourceId)}`)
      setUploadStatus({
        type: 'success',
        message: `Successfully deleted ${getFilename(sourceId)}`,
      })
      loadDocuments()
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: axios.isAxiosError(error) ? (error.response?.data?.detail || error.message) : 'An unexpected error occurred',
      })
    }
  }

  // Filter and Sort logic
  const filteredAndSortedDocuments = documents
    .filter((doc) => {
      if (!searchQuery) return true
      return getFilename(doc.source_id).toLowerCase().includes(searchQuery.toLowerCase())
    })
    .sort((a, b) => {
      const nameA = getFilename(a.source_id).toLowerCase()
      const nameB = getFilename(b.source_id).toLowerCase()
      
      let comparison = 0
      if (sortBy === 'name') {
        comparison = nameA.localeCompare(nameB)
      } else if (sortBy === 'type') {
        const extA = getFileExtension(nameA)
        const extB = getFileExtension(nameB)
        comparison = extA.localeCompare(extB)
        if (comparison === 0) {
           comparison = nameA.localeCompare(nameB)
        }
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 overflow-y-auto scrollbar-hide w-full">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        
        {/* Upload Zone */}
        <section>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-zinc-100">Add Documents</h3>
            <p className="text-xs text-zinc-400 mt-1">Upload PDF, CSV, or Excel files to add them to your AI's knowledge base.</p>
          </div>
          
          <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              dragActive 
                ? 'border-indigo-500 bg-indigo-500/5' 
                : 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700'
            } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".pdf,.csv,.xlsx,.xls"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploading}
            />
            <div className="flex flex-col items-center justify-center gap-3 pointer-events-none">
              <div className="p-3 bg-zinc-800/50 rounded-full border border-zinc-700/50">
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                ) : (
                  <UploadCloud className="w-6 h-6 text-zinc-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-200">
                  {uploading ? 'Processing document...' : 'Click or drag PDF, CSV, or Excel to upload'}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Max file size: 50MB</p>
              </div>
            </div>
          </div>

          {/* Status Message */}
          {uploadStatus && (
            <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 border ${
              uploadStatus.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {uploadStatus.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              )}
              <p className="text-sm font-medium leading-relaxed">{uploadStatus.message}</p>
            </div>
          )}
        </section>

        {/* Document List */}
        <section>
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Indexed Documents</h3>
              <p className="text-xs text-zinc-400 mt-1">Manage files currently available to the AI.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input 
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50 w-full sm:w-48 placeholder:text-zinc-600"
                />
              </div>

              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'type')}
                className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
              >
                <option value="name">Sort by Name</option>
                <option value="type">Sort by Type</option>
              </select>

              <button 
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            {loading ? (
              <div className="divide-y divide-zinc-800/50">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-4 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-zinc-800 rounded-lg"></div>
                      <div className="w-48 h-4 bg-zinc-800 rounded"></div>
                    </div>
                    <div className="w-8 h-8 bg-zinc-800 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : filteredAndSortedDocuments.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <FileText className="w-8 h-8 text-zinc-600 mb-3" />
                <p className="text-sm font-medium text-zinc-300">
                  {documents.length === 0 ? "No documents found" : "No documents match your search"}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {documents.length === 0 ? "Upload a document to get started" : "Try adjusting your search filters"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {filteredAndSortedDocuments.map((doc) => {
                  const filename = getFilename(doc.source_id)
                  const nameWithoutExt = getFilenameWithoutExtension(doc.source_id)
                  const extension = filename.split('.').pop() || ''
                  
                  return (
                    <div key={doc.source_id} className="p-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors group">
                      <div className="flex items-center gap-3 overflow-hidden pr-4 flex-1">
                        <div className="p-2 bg-zinc-800 rounded-lg flex-shrink-0 border border-zinc-700/50 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-colors">
                          <FileText className="w-4 h-4 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 overflow-hidden">
                          <span className="text-sm font-medium text-zinc-300 truncate">
                            {nameWithoutExt}
                          </span>
                          <FileTypeBadge extension={extension} />
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(doc.source_id)}
                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 flex-shrink-0 focus:opacity-100"
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

      </div>
      </div>
    </div>
  )
}