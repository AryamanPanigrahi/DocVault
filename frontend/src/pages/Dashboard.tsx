import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isTauri } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { readFile } from '@tauri-apps/plugin-fs'
import { getFileTypeInfo } from '../utils/fileType'
import { formatBytes, formatRelativeTime } from '../utils/format'
import useTheme from '../hooks/useTheme'
import Sidebar from '../components/Sidebar'
import MobileTopBar from '../components/MobileTopBar'
import { API_URL } from '../config'

interface DetectedFile {
  path: string
  mime_type: string | null
}

interface Document {
  id: number
  filename: string
  content_type: string | null
  size_bytes: number | null
  uploaded_at: string
  extracted_text: string | null
}

interface UserInfo {
  email: string
}

function Dashboard() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserInfo | null>(null)
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<{ text: string; error: boolean } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date')
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  function handleUnauthorized() {
    localStorage.removeItem('access_token')
    navigate('/login')
  }

  async function fetchDocuments() {
    const token = localStorage.getItem('access_token')

    const response = await fetch(`${API_URL}/documents`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (response.status === 401) {
      handleUnauthorized()
      return
    }

    if (response.ok) {
      const data = await response.json()
      setDocuments(data)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchDocuments()
    fetchCurrentUser()
  }, [])

  // Desktop-only: the Tauri watcher (src-tauri/src/watcher.rs) emits this
  // event when it detects a new file in the OS Downloads folder. No-op in
  // the web build, where isTauri() is false.
  useEffect(() => {
    if (!isTauri()) return

    const unlistenPromise = listen<DetectedFile>('file-detected', async (event) => {
      try {
        const { path, mime_type } = event.payload
        const bytes = await readFile(path)
        const filename = path.split(/[\\/]/).pop() ?? 'file'
        const file = new File([bytes], filename, mime_type ? { type: mime_type } : undefined)
        await uploadFile(file)
      } catch (err) {
        console.error('Failed to auto-ingest detected file', err)
      }
    })

    // Chained off the promise itself, not a variable assigned once it
    // resolves — StrictMode's mount/unmount/remount in dev can unmount
    // before listen() resolves, so a plain `let unlisten` closure would
    // still be undefined at cleanup time and silently leak the listener.
    return () => {
      unlistenPromise.then((unlisten) => unlisten())
    }
  }, [])

  async function fetchCurrentUser() {
    const token = localStorage.getItem('access_token')

    const response = await fetch(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (response.ok) {
      const data = await response.json()
      setUser({ email: data.email })
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim() === '') {
        fetchDocuments()
      } else {
        runSearch()
      }
    }, 400)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  async function runSearch() {
    setSearching(true)
    const token = localStorage.getItem('access_token')

    const response = await fetch(
      `${API_URL}/documents/search?q=${encodeURIComponent(searchQuery)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (response.status === 401) {
      handleUnauthorized()
      return
    }

    if (response.ok) {
      const data = await response.json()
      setDocuments(data)
    }

    setSearching(false)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
  }

  function handleLogout() {
    localStorage.removeItem('access_token')
    navigate('/login')
  }

  async function uploadFile(file: File) {
    setUploading(true)
    const token = localStorage.getItem('access_token')

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    if (response.status === 401) {
      handleUnauthorized()
      return
    }

    if (response.ok) {
      await fetchDocuments()
      setUploadMessage({ text: 'File uploaded successfully', error: false })
    } else {
      setUploadMessage({ text: 'Upload failed', error: true })
    }

    setUploading(false)
    setTimeout(() => setUploadMessage(null), 3000)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadFile(file)
    e.target.value = ''
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) await uploadFile(file)
  }

  useEffect(() => {
    if (!selectedDoc) return

    let objectUrl: string | null = null

    async function loadPreview() {
      const canPreview =
        selectedDoc!.content_type === 'application/pdf' ||
        selectedDoc!.content_type?.startsWith('image/')

      if (!canPreview) {
        setPreviewUrl(null)
        return
      }

      const token = localStorage.getItem('access_token')
      const response = await fetch(
        `${API_URL}/documents/${selectedDoc!.id}/download`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.status === 401) {
        handleUnauthorized()
        return
      }

      if (response.ok) {
        const blob = await response.blob()
        objectUrl = window.URL.createObjectURL(blob)
        setPreviewUrl(objectUrl)
      }
    }

    loadPreview()

    return () => {
      if (objectUrl) window.URL.revokeObjectURL(objectUrl)
    }
  }, [selectedDoc])

  useEffect(() => {
    async function handlePaste(e: ClipboardEvent) {
      const file = e.clipboardData?.files?.[0]
      if (file) await uploadFile(file)
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [])

  useEffect(() => {
    if (!selectedDoc) return

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSelectedDoc(null)
        setPreviewUrl(null)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [selectedDoc])

  async function handleDownload(id: number, filename: string) {
    const token = localStorage.getItem('access_token')

    const response = await fetch(`${API_URL}/documents/${id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (response.status === 401) {
      handleUnauthorized()
      return
    }

    if (!response.ok) {
      setUploadMessage({ text: 'Download failed', error: true })
      setTimeout(() => setUploadMessage(null), 3000)
      return
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    window.URL.revokeObjectURL(url)
  }

  async function handleDelete(id: number) {
    const confirmed = window.confirm('Delete this document? This cannot be undone.')
    if (!confirmed) return

    const token = localStorage.getItem('access_token')

    const response = await fetch(`${API_URL}/documents/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    if (response.status === 401) {
      handleUnauthorized()
      return
    }

    if (response.ok) {
      setDocuments((prev) => prev.filter((doc) => doc.id !== id))
      setUploadMessage({ text: 'Document deleted', error: false })
    } else {
      setUploadMessage({ text: 'Delete failed', error: true })
    }

    setTimeout(() => setUploadMessage(null), 3000)
  }

  const totalBytes = documents.reduce((sum, doc) => sum + (doc.size_bytes ?? 0), 0)

  const sortedDocuments = [...documents].sort((a, b) => {
    if (sortBy === 'name') return a.filename.localeCompare(b.filename)
    if (sortBy === 'size') return (b.size_bytes ?? 0) - (a.size_bytes ?? 0)
    return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
  })

  return (
    <div className="h-screen flex bg-white dark:bg-app-bg">
      <Sidebar
        activePage="documents"
        userEmail={user?.email ?? null}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <main
        className="flex-1 overflow-y-auto p-8"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="max-w-4xl mx-auto">
        <MobileTopBar onOpenMenu={() => setMobileMenuOpen(true)} />
        <div className="flex items-baseline justify-between mb-1">
          <h1 className="text-3xl text-slate-900 dark:text-white font-bold">Your Documents</h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
          {documents.length} {documents.length === 1 ? 'document' : 'documents'} · {formatBytes(totalBytes)} total · drag &amp; drop files anywhere to upload
        </p>

        <div
          className={`border-2 border-dashed rounded-xl p-6 mb-6 flex items-center justify-between transition-all ${
            dragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-[0_0_20px_rgba(59,130,246,0.4)]'
              : 'border-slate-300 dark:border-app-border'
          }`}
        >
          <div>
            <p className="text-slate-900 dark:text-white font-medium text-sm">Add a document</p>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Drag & drop, paste, or click to browse</p>
          </div>
          <label className="cursor-pointer">
            <span className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium inline-block">
              {uploading ? 'Uploading...' : 'Upload'}
            </span>
            <input type="file" onChange={handleFileUpload} disabled={uploading} className="hidden" />
          </label>
        </div>

        <div className="flex gap-2 mb-6">
          <div className="relative">
            <button
              onClick={() => setSortMenuOpen((prev) => !prev)}
              className="bg-slate-100 dark:bg-app-surface text-slate-900 dark:text-white p-2.5 rounded-md border border-slate-200 dark:border-app-border"
              title="Sort"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <line x1="2" y1="5" x2="16" y2="5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <line x1="2" y1="9" x2="11" y2="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <line x1="2" y1="13" x2="6" y2="13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>

            {sortMenuOpen && (
              <div className="absolute top-full mt-1 left-0 bg-white dark:bg-app-surface border border-slate-200 dark:border-app-border rounded-md shadow-lg py-1 w-40 z-10">
                {(['date', 'name', 'size'] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setSortBy(option)
                      setSortMenuOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 ${
                      sortBy === option
                        ? 'text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {option === 'date' ? 'Newest first' : option === 'name' ? 'Name (A-Z)' : 'Largest first'}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleSearch} className="flex-1 flex gap-2 max-w-sm">
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 dark:bg-app-surface text-slate-900 dark:text-white px-3 py-2 rounded-md text-sm border border-slate-200 dark:border-app-border"
            />
          </form>
        </div>

        {loading && (
          <p className="text-slate-500 dark:text-slate-400 text-sm">Loading your documents...</p>
        )}

        {!loading && !searching && documents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {searchQuery.trim() === ''
                ? 'Nothing here yet — use the box above to add your first document.'
                : `No documents match "${searchQuery}".`}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {sortedDocuments.map((doc) => {
            const { label, color } = getFileTypeInfo(doc.content_type)
            return (
              <div
                key={doc.id}
                onClick={() => {
                  setPreviewUrl(null)
                  setSelectedDoc(doc)
                }}
                className="group bg-slate-100 dark:bg-app-surface p-4 rounded-lg flex flex-wrap items-center gap-4 border border-slate-200 dark:border-app-border hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer"
              >
                <div
                  className={`${color} text-white text-xs font-bold w-10 h-10 rounded-lg flex items-center justify-center shrink-0`}
                >
                  {label}
                </div>
                <div className="flex-1 min-w-[140px]">
                  <p className="text-slate-900 dark:text-white font-medium truncate" title={doc.filename}>{doc.filename}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    {formatBytes(doc.size_bytes)} · {formatRelativeTime(doc.uploaded_at)}
                  </p>
                </div>
                <div
                  className="flex gap-2 max-md:opacity-100 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleDownload(doc.id, doc.filename)}
                    className="text-sm px-3 py-1.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="text-sm px-3 py-1.5 rounded-md bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        </div>

        {uploadMessage && (
          <div
            className={`fixed bottom-6 left-6 px-4 py-3 rounded-lg text-sm text-white shadow-lg backdrop-blur-sm ${
              uploadMessage.error ? 'bg-red-600/90' : 'bg-green-600/90'
            }`}
          >
            {uploadMessage.text}
          </div>
        )}

        {selectedDoc && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6"
            onClick={() => {
              setSelectedDoc(null)
              setPreviewUrl(null)
            }}
          >
            <div
              className="bg-white dark:bg-app-surface rounded-2xl max-w-4xl w-full h-[90vh] overflow-hidden flex flex-col shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-200 dark:border-app-border flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-slate-900 dark:text-white font-semibold break-words">
                    {selectedDoc.filename}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    {formatBytes(selectedDoc.size_bytes)} · {formatRelativeTime(selectedDoc.uploaded_at)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedDoc(null)
                    setPreviewUrl(null)
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl leading-none shrink-0"
                >
                  ×
                </button>
              </div>

              <div className="overflow-y-auto flex-1">
                {previewUrl && selectedDoc.content_type?.startsWith('image/') && (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-black/20 p-4">
                    <img src={previewUrl} alt={selectedDoc.filename} className="max-w-full max-h-full object-contain" />
                  </div>
                )}

                {previewUrl && selectedDoc.content_type === 'application/pdf' && (
                  <iframe src={previewUrl} title={selectedDoc.filename} className="w-full h-full min-h-[75vh]" />
                )}

                {!previewUrl &&
                  (selectedDoc.content_type === 'application/pdf' ||
                    selectedDoc.content_type?.startsWith('image/')) && (
                    <div className="w-full h-full flex items-center justify-center">
                      <p className="text-slate-400 dark:text-slate-500 text-sm">Loading preview...</p>
                    </div>
                  )}

                {!previewUrl &&
                  !(
                    selectedDoc.content_type === 'application/pdf' ||
                    selectedDoc.content_type?.startsWith('image/')
                  ) && (
                  <div className="p-6">
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">
                      Extracted text
                    </p>
                    {selectedDoc.extracted_text ? (
                      <p className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap">
                        {selectedDoc.extracted_text}
                      </p>
                    ) : (
                      <p className="text-slate-400 dark:text-slate-500 text-sm italic">
                        No preview or extracted text available for this file type.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-app-border flex gap-2 justify-end">
                <button
                  onClick={() => handleDownload(selectedDoc.id, selectedDoc.filename)}
                  className="text-sm px-4 py-2 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  Download
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Dashboard