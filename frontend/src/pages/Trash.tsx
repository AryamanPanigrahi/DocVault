import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFileTypeInfo } from '../utils/fileType'
import { formatBytes } from '../utils/format'
import useTheme from '../hooks/useTheme'
import Sidebar from '../components/Sidebar'
import MobileTopBar from '../components/MobileTopBar'
import { API_URL } from '../config'

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

function Trash() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  function handleUnauthorized() {
    localStorage.removeItem('access_token')
    navigate('/login')
  }

  async function fetchTrash() {
    const token = localStorage.getItem('access_token')

    const response = await fetch(`${API_URL}/documents/trash`, {
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
    fetchTrash()
    fetchCurrentUser()
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

  function handleLogout() {
    localStorage.removeItem('access_token')
    navigate('/login')
  }

  async function handleRestore(id: number) {
    const token = localStorage.getItem('access_token')

    const response = await fetch(`${API_URL}/documents/${id}/restore`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })

    if (response.status === 401) {
      handleUnauthorized()
      return
    }

    if (response.ok) {
      setDocuments((prev) => prev.filter((doc) => doc.id !== id))
    }
  }

  async function handlePermanentDelete(id: number) {
    const confirmed = window.confirm(
      'Permanently delete this document? This cannot be undone.'
    )
    if (!confirmed) return

    const token = localStorage.getItem('access_token')

    const response = await fetch(`${API_URL}/documents/${id}/permanent`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    if (response.status === 401) {
      handleUnauthorized()
      return
    }

    if (response.ok) {
      setDocuments((prev) => prev.filter((doc) => doc.id !== id))
    }
  }

  return (
    <div className="h-screen flex bg-white dark:bg-app-bg">
      <Sidebar
        activePage="trash"
        userEmail={user?.email ?? null}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
        <MobileTopBar onOpenMenu={() => setMobileMenuOpen(true)} />
        <h1 className="text-3xl text-slate-900 dark:text-white font-bold mb-1">Trash</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            Documents here can be restored or permanently deleted.
        </p>

        {loading && <p className="text-slate-500 dark:text-slate-400 text-sm">Loading...</p>}

        {!loading && documents.length === 0 && (
          <div className="border border-dashed border-slate-300 dark:border-app-border rounded-lg p-12 text-center">
            <p className="text-slate-900 dark:text-white font-medium mb-1">Trash is empty</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {documents.map((doc) => {
            const { label, color } = getFileTypeInfo(doc.content_type)
            return (
              <div
                key={doc.id}
                className="bg-slate-100 dark:bg-app-surface p-4 rounded-lg flex flex-wrap items-center gap-4 border border-slate-200 dark:border-app-border"
              >
                <div
                  className={`${color} text-white text-xs font-bold w-10 h-10 rounded-lg flex items-center justify-center shrink-0`}
                >
                  {label}
                </div>
                <div className="flex-1 min-w-[140px]">
                  <p className="text-slate-900 dark:text-white font-medium truncate">{doc.filename}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    {formatBytes(doc.size_bytes)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRestore(doc.id)}
                    className="text-sm px-3 py-1.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(doc.id)}
                    className="text-sm px-3 py-1.5 rounded-md bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
                  >
                    Delete Forever
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        </div>
      </main>
    </div>
  )
}

export default Trash