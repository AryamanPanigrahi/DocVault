import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFileTypeInfo } from '../utils/fileType'
import useTheme from '../hooks/useTheme'

interface Document {
  id: number
  filename: string
  content_type: string | null
  size_bytes: number | null
  uploaded_at: string
}

function Dashboard() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<{ text: string; error: boolean } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)

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
  }, [])

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
  function handleUnauthorized() {
  localStorage.removeItem('access_token')
  navigate('/login')
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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
  }
  return (
    <div className="min-h-screen flex bg-white dark:bg-app-bg">
      <aside className="w-56 shrink-0 border-r border-slate-200 dark:border-app-border p-6 flex flex-col justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-8">DocVault</h2>
          <nav className="flex flex-col gap-1">
            <span className="px-3 py-2 rounded-md bg-slate-100 dark:bg-app-surface text-slate-900 dark:text-white text-sm font-medium">
              All Documents
            </span>
            <span className="px-3 py-2 rounded-md text-slate-500 dark:text-slate-400 text-sm">
              Recent
            </span>
            <span className="px-3 py-2 rounded-md text-slate-500 dark:text-slate-400 text-sm">
              Trash
            </span>
          </nav>
        </div>

        <div className="flex flex-col gap-2">
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

      <main className="flex-1 p-8"><h1 className="text-3xl text-slate-900 dark:text-white font-bold mb-6">Your Documents</h1>

        <form onSubmit={handleSearch} className="mb-6 flex gap-2">
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-100 dark:bg-app-surface text-slate-900 dark:text-white px-3 py-2 rounded-md text-sm border border-slate-200 dark:border-app-border w-64"
          />
          <button
            type="submit"
            className="bg-slate-100 dark:bg-app-surface text-slate-900 dark:text-white px-4 py-2 rounded-md text-sm"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>
        
        <label className="inline-block mb-6 cursor-pointer">
          <span className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium">
            {uploading ? 'Uploading...' : '+ Upload Document'}
          </span>
          <input
            type="file"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
        {loading && <p className="text-slate-500 dark:text-slate-400">Loading...</p>}

        {!loading && documents.length === 0 && (
          <p className="text-slate-500 dark:text-slate-400">No documents yet.</p>
        )}

        <div className="flex flex-col gap-2">
          {documents.map((doc) => {
            const { label, color } = getFileTypeInfo(doc.content_type)
            return (
              <div
                key={doc.id}
                className="bg-slate-100 dark:bg-app-surface p-4 rounded-lg flex items-center gap-4 border border-slate-200 dark:border-app-border"
              >
                <div
                  className={`${color} text-white text-xs font-bold w-10 h-10 rounded-lg flex items-center justify-center shrink-0`}
                >
                  {label}
                </div>
                <div className="flex-1">
                  <p className="text-slate-900 dark:text-white font-medium">{doc.filename}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    {doc.size_bytes} bytes
                  </p>
                </div>
                <div className="flex gap-2">
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