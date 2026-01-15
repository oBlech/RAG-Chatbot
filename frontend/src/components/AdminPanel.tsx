'use client'

import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react'
import axios from 'axios'

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

function DocumentSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
      <div className="flex items-center space-x-3 flex-1">
        <div className="w-8 h-8 skeleton rounded"></div>
        <div className="flex-1">
          <div className="h-4 skeleton rounded mb-2 w-3/4"></div>
          <div className="h-3 skeleton rounded w-1/2"></div>
        </div>
      </div>
      <div className="w-20 h-8 skeleton rounded"></div>
    </div>
  )
}

function getFilename(sourceId: string): string {
  // Extract just the filename from path (handles both / and \ separators)
  const parts = sourceId.split(/[/\\]/)
  return parts[parts.length - 1] || sourceId
}

export default function AdminPanel() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [uploading, setUploading] = useState<boolean>(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null)
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

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile)
      setUploadStatus(null)
      
      // Auto-upload when file is selected
      await handleUploadFile(selectedFile)
    } else {
      setUploadStatus({ type: 'error', message: 'Please select a PDF file' })
      setFile(null)
    }
  }

  const handleUploadFile = async (selectedFile: File) => {
    setUploading(true)
    setUploadStatus(null)

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const response = await axios.post<UploadResponse>('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      setUploadStatus({
        type: 'success',
        message: `Successfully uploaded ${response.data.source_id} (${response.data.chunks_ingested} chunks)`,
      })
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      loadDocuments()
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: axios.isAxiosError(error) ? (error.response?.data?.detail || error.message) : 'An unexpected error occurred',
      })
      setFile(null)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (sourceId: string) => {
    if (!confirm(`Are you sure you want to delete "${sourceId}"?`)) return

    try {
      await axios.delete(`/api/documents/${encodeURIComponent(sourceId)}`)
      setUploadStatus({
        type: 'success',
        message: `Successfully deleted ${sourceId}`,
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
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="backdrop-blur-sm bg-white/5 rounded-xl p-6 border border-white/10">
        <h2 className="text-xl font-semibold text-white mb-4">Upload PDF Document</h2>
        <div className="space-y-4">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            ref={fileInputRef}
            className="hidden"
            disabled={uploading}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors font-medium shadow-lg hover:shadow-xl disabled:shadow-none"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
          {uploadStatus && (
            <div
              className={`mt-4 p-3 rounded-lg ${
                uploadStatus.type === 'success'
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}
            >
              {uploadStatus.message}
            </div>
          )}
        </div>
      </div>

      {/* Documents List */}
      <div className="backdrop-blur-sm bg-white/5 rounded-xl p-6 border border-white/10">
        <h2 className="text-xl font-semibold text-white mb-4">Documents in System</h2>
        {loading ? (
          <div className="space-y-2">
            <DocumentSkeleton />
            <DocumentSkeleton />
            <DocumentSkeleton />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">📄</div>
            <p>No documents uploaded yet</p>
            <p className="text-sm mt-1">Upload a PDF to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.source_id}
                className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">📄</div>
                  <div>
                    <div className="font-medium text-white">{getFilename(doc.source_id)}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(doc.source_id)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
