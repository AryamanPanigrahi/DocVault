import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getFileTypeInfo } from '../utils/fileType'
import { formatBytes, formatRelativeTime } from '../utils/format'
import useTheme from '../hooks/useTheme'
import Logo from '../components/Logo'

interface Document {
  id: number
  filename: string
  content_type: string | null
  size_bytes: number | null
  uploaded_at: string
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

  function handleUnauthorized() {
    localStorage.removeItem('access_token')
    navigate('/login')
  }

  async function fetchDocuments() {
    const token = localStorage.getItem('access_token')

    const response = await fetch('http://127.0.0.1:8000/documents', {
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

  async function fetchCurrentUser() {
    const token = localStorage.getItem('access_token')

    const response = await fetch('http://127.0.0.1:8000/me', {
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
      `http://127.0.0.1:8000/documents/search?q=${encodeURIComponent(searchQuery)}`,
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

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const token = localStorage.getItem('access_token')

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('http://127.0.0.1:8000/documents/upload', {
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
    e.target.value = ''
    setTimeout(() => setUploadMessage(null), 3000)
  }

  async function handleDownload(id: number, filename: string) {
    const token = localStorage.getItem('access_token')

    const response = await fetch(`http://127.0.0.1:8000/documents/${id}/download`, {
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

    const response = await fetch(`http://127.0.0.1:8000/documents/${id}`, {
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

  return (
    <div className="min-h-screen flex bg-white dark:bg-app-bg">
      <aside className="w-56 shrink-0 border-r border-slate-200 dark:border-app-border p-6 flex flex-col justify-between">
        <div>
          <div className="mb-8">
            <Logo size={32} />
          </div>
          <nav className="flex flex-col gap-1">
            <span className="px-3 py-2 rounded-md bg-slate-100 dark:bg-app-surface text-slate-900 dark:text-white text-sm font-medium">
              All Documents
            </span>
            <Link
              to="/trash"
              className="px-3 py-2 rounded-md text-slate-500 dark:text-slate-400 text-sm"
            >
              Trash
            </Link>
          </nav>
        </div>

        <div className="flex flex-col gap-3">
          {user && (
            <div className="flex items-center gap-2 px-1 mb-1">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {user.email.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</span>
            </div>
          )}
          <button
            onClick={toggleTheme}
            className="bg-slate-100 dark:bg-app-surface text-slate-900 dark:text-white px-3 py-2 rounded-md text-sm"
          >
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button
            onClick={handleLogout}
            className="bg-slate-100 dark:bg-app-surface text-slate-900 dark:text-white px-3 py-2 rounded-md text-sm"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 max-w-4xl">
        <div className="flex items-baseline justify-between mb-1">
          <h1 className="text-3xl text-slate-900 dark:text-white font-bold">Your Documents</h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
          {documents.length} {documents.length === 1 ? 'document' : 'documents'} · {formatBytes(totalBytes)} total
        </p>

        <div className="flex gap-2 mb-6">
          <label className="cursor-pointer">
            <span className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium inline-block">
              {uploading ? 'Uploading...' : '+ Upload Document'}
            </span>
            <input type="file" onChange={handleFileUpload} disabled={uploading} className="hidden" />
          </label>

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
          <div className="border border-dashed border-slate-300 dark:border-app-border rounded-lg p-12 text-center">
            <p className="text-slate-900 dark:text-white font-medium mb-1">No documents yet</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Upload your first document to get started.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {documents.map((doc) => {
            const { label, color } = getFileTypeInfo(doc.content_type)
            return (
              <div
                key={doc.id}
                className="group bg-slate-100 dark:bg-app-surface p-4 rounded-lg flex items-center gap-4 border border-slate-200 dark:border-app-border hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                <div
                  className={`${color} text-white text-xs font-bold w-10 h-10 rounded-lg flex items-center justify-center shrink-0`}
                >
                  {label}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 dark:text-white font-medium truncate">{doc.filename}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    {formatBytes(doc.size_bytes)} · {formatRelativeTime(doc.uploaded_at)}
                  </p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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

        {uploadMessage && (
          <div
            className={`fixed bottom-6 left-6 px-4 py-3 rounded-lg text-sm text-white shadow-lg backdrop-blur-sm ${
              uploadMessage.error ? 'bg-red-600/90' : 'bg-green-600/90'
            }`}
          >
            {uploadMessage.text}
          </div>
        )}
      </main>
    </div>
  )
}

export default Dashboard