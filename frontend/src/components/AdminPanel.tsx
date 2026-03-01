'use client'

import { useState, useEffect, useRef, ChangeEvent } from 'react'
import axios from 'axios'
import { UploadCloud, Trash2, FileText, Database, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

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

export default function AdminPanel() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [uploading, setUploading] = useState<boolean>(false)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null)
  const [dragActive, setDragActive] = useState<boolean>(false)
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
    if (selectedFile.type !== 'application/pdf') {
      setUploadStatus({ type: 'error', message: 'Please select a valid PDF file' })
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

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 overflow-y-auto scrollbar-hide w-full">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        
        {/* Upload Zone */}
        <section>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-zinc-100">Add Documents</h3>
            <p className="text-xs text-zinc-400 mt-1">Upload PDF files to add them to your AI's knowledge base.</p>
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
              accept=".pdf"
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
                  {uploading ? 'Processing document...' : 'Click or drag PDF to upload'}
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
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Indexed Documents</h3>
              <p className="text-xs text-zinc-400 mt-1">Manage files currently available to the AI.</p>
            </div>
            <div className="text-xs font-medium text-zinc-500 bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">
              {documents.length} files
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
            ) : documents.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <FileText className="w-8 h-8 text-zinc-600 mb-3" />
                <p className="text-sm font-medium text-zinc-300">No documents found</p>
                <p className="text-xs text-zinc-500 mt-1">Upload a document to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {documents.map((doc) => (
                  <div key={doc.source_id} className="p-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors group">
                    <div className="flex items-center gap-3 overflow-hidden pr-4">
                      <div className="p-2 bg-zinc-800 rounded-lg flex-shrink-0 border border-zinc-700/50 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-colors">
                        <FileText className="w-4 h-4 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
                      </div>
                      <span className="text-sm font-medium text-zinc-300 truncate">
                        {getFilename(doc.source_id)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(doc.source_id)}
                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 flex-shrink-0 focus:opacity-100"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

      </div>
      </div>
    </div>
  )
}