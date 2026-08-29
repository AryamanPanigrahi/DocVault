import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFileTypeInfo } from '../utils/fileType'
import { formatBytes, formatRelativeTime } from '../utils/format'
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
  extracted_text: string | null
  folder_id: number | null
}

interface Folder {
  id: number
  name: string
  parent_id: number | null
  auto_keywords: string | null
  created_at: string
}

interface UserInfo {
  email: string
}

// Depth from root, by walking parent_id — used to indent folders in the
// "Move to..." dropdown so nesting is visible even in a flat <select>.
function getFolderDepth(folderId: number, folders: Folder[]): number {
  let depth = 0
  let current = folders.find((f) => f.id === folderId)
  while (current?.parent_id != null) {
    depth += 1
    current = folders.find((f) => f.id === current!.parent_id)
  }
  return depth
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
  const [folders, setFolders] = useState<Folder[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null)
  const [moveMenuOpenFor, setMoveMenuOpenFor] = useState<number | null>(null)
  const [folderMenuOpenFor, setFolderMenuOpenFor] = useState<number | null>(null)

  function handleUnauthorized() {
    localStorage.removeItem('access_token')
    navigate('/login')
  }

  async function fetchDocuments() {
    const token = localStorage.getItem('access_token')

    const url =
      currentFolderId === null
        ? `${API_URL}/documents`
        : `${API_URL}/documents?folder_id=${currentFolderId}`

    const response = await fetch(url, {
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

  async function fetchFolders() {
    const token = localStorage.getItem('access_token')

    const response = await fetch(`${API_URL}/folders`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (response.status === 401) {
      handleUnauthorized()
      return
    }

    if (response.ok) {
      const data = await response.json()
      setFolders(data)
    }
  }

  useEffect(() => {
    fetchCurrentUser()
    fetchFolders()
  }, [])

  // Re-fetch whenever the current folder changes (including the initial
  // mount, at currentFolderId's default of null/root) — but only while
  // not searching, since search is intentionally unscoped (searches every
  // folder, not just the current one) and shouldn't be clobbered by a
  // folder-scoped refetch racing behind it.
  useEffect(() => {
    if (searchQuery.trim() === '') {
      fetchDocuments()
    }
    setMoveMenuOpenFor(null)
    setFolderMenuOpenFor(null)
  }, [currentFolderId])

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

  async function createFolder() {
    const name = window.prompt('Folder name?')
    if (!name || !name.trim()) return

    const token = localStorage.getItem('access_token')
    const response = await fetch(`${API_URL}/folders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), parent_id: currentFolderId }),
    })

    if (response.status === 401) {
      handleUnauthorized()
      return
    }

    if (response.ok) {
      await fetchFolders()
    } else {
      setUploadMessage({ text: 'Could not create folder', error: true })
      setTimeout(() => setUploadMessage(null), 3000)
    }
  }

  async function renameFolder(folder: Folder) {
    const name = window.prompt('Rename folder', folder.name)
    if (!name || !name.trim() || name.trim() === folder.name) return

    const token = localStorage.getItem('access_token')
    const response = await fetch(`${API_URL}/folders/${folder.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    })

    if (response.status === 401) {
      handleUnauthorized()
      return
    }

    if (response.ok) await fetchFolders()
  }

  async function deleteFolder(folder: Folder) {
    const confirmed = window.confirm(
      `Delete "${folder.name}"? Its contents (files and subfolders) will move to the root, not be deleted.`
    )
    if (!confirmed) return

    const token = localStorage.getItem('access_token')
    const response = await fetch(`${API_URL}/folders/${folder.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    if (response.status === 401) {
      handleUnauthorized()
      return
    }

    if (response.ok) {
      await fetchFolders()
      await fetchDocuments()
    }
  }

  async function moveDocument(documentId: number, folderId: number | null) {
    const token = localStorage.getItem('access_token')
    const response = await fetch(`${API_URL}/documents/${documentId}/move`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_id: folderId }),
    })

    if (response.status === 401) {
      handleUnauthorized()
      return
    }

    if (response.ok) {
      // Moved out of the currently-viewed folder — it should disappear
      // from this list immediately rather than waiting for a refetch.
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId))
      setMoveMenuOpenFor(null)
    }
  }

  // Path from root to the current folder, for the breadcrumb — walks the
  // parent_id chain backwards then reverses it.
  function getBreadcrumbPath(): Folder[] {
    const path: Folder[] = []
    let current = folders.find((f) => f.id === currentFolderId)
    while (current) {
      path.unshift(current)
      current = current.parent_id != null ? folders.find((f) => f.id === current!.parent_id) : undefined
    }
    return path
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
  }

  function handleLogout() {
    localStorage.removeItem('access_token')
    navigate('/login')
  }

  async function uploadFile(file: File): Promise<Document | undefined> {
    setUploading(true)
    const token = localStorage.getItem('access_token')

    const formData = new FormData()
    formData.append('file', file)
    if (currentFolderId !== null) {
      formData.append('folder_id', String(currentFolderId))
    }

    const response = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    if (response.status === 401) {
      handleUnauthorized()
      return undefined
    }

    let uploaded: Document | undefined

    if (response.ok) {
      uploaded = await response.json()
      await fetchDocuments()
      setUploadMessage({ text: 'File uploaded successfully', error: false })
    } else {
      setUploadMessage({ text: 'Upload failed', error: true })
    }

    setUploading(false)
    setTimeout(() => setUploadMessage(null), 3000)
    return uploaded
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

  const isSearching = searchQuery.trim() !== ''
  // Subfolders live inside the current folder aren't shown at all while
  // searching — search results span every folder, so a subfolder list
  // scoped to "here" would be misleading in that context.
  const childFolders = isSearching
    ? []
    : folders
        .filter((f) => f.parent_id === currentFolderId)
        .sort((a, b) => a.name.localeCompare(b.name))
  const breadcrumbPath = getBreadcrumbPath()

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
        onNavigateHome={() => setCurrentFolderId(null)}
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

        {!isSearching && (
          <div className="flex items-center flex-wrap gap-1 text-sm mb-2">
            <button
              onClick={() => setCurrentFolderId(null)}
              className={
                currentFolderId === null
                  ? 'text-slate-900 dark:text-white font-medium'
                  : 'text-slate-500 dark:text-slate-400 hover:underline'
              }
            >
              Home
            </button>
            {breadcrumbPath.map((folder) => (
              <span key={folder.id} className="flex items-center gap-1">
                <span className="text-slate-400 dark:text-slate-600">/</span>
                <button
                  onClick={() => setCurrentFolderId(folder.id)}
                  className={
                    folder.id === currentFolderId
                      ? 'text-slate-900 dark:text-white font-medium'
                      : 'text-slate-500 dark:text-slate-400 hover:underline'
                  }
                >
                  {folder.name}
                </button>
              </span>
            ))}
          </div>
        )}

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
          <button
            onClick={createFolder}
            className="bg-slate-100 dark:bg-app-surface text-slate-900 dark:text-white px-3 py-2.5 rounded-md border border-slate-200 dark:border-app-border text-sm font-medium whitespace-nowrap"
          >
            + Folder
          </button>

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

        {!loading && !searching && documents.length === 0 && childFolders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {searchQuery.trim() === ''
                ? 'Nothing here yet — use the box above to add your first document.'
                : `No documents match "${searchQuery}".`}
            </p>
          </div>
        )}

        {childFolders.length > 0 && (
          <div className="flex flex-col gap-2 mb-2">
            {childFolders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => setCurrentFolderId(folder.id)}
                className="group bg-slate-50 dark:bg-app-surface/60 p-4 rounded-lg flex items-center gap-4 border border-slate-200 dark:border-app-border hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer"
              >
                <div className="text-amber-500 dark:text-amber-400 w-10 h-10 flex items-center justify-center shrink-0">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h5.379a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 12.12 6H20.5A1.5 1.5 0 0 1 22 7.5v11A1.5 1.5 0 0 1 20.5 20h-17A1.5 1.5 0 0 1 2 18.5v-13Z" />
                  </svg>
                </div>
                <p className="flex-1 text-slate-900 dark:text-white font-medium truncate">{folder.name}</p>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setFolderMenuOpenFor((prev) => (prev === folder.id ? null : folder.id))}
                    className="text-sm px-2 py-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 max-md:opacity-100 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    •••
                  </button>
                  {folderMenuOpenFor === folder.id && (
                    <div className="absolute top-full right-0 mt-1 bg-white dark:bg-app-surface border border-slate-200 dark:border-app-border rounded-md shadow-lg py-1 w-32 z-10">
                      <button
                        onClick={() => {
                          setFolderMenuOpenFor(null)
                          renameFolder(folder)
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => {
                          setFolderMenuOpenFor(null)
                          deleteFolder(folder)
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-red-600 dark:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
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
                  <div className="relative">
                    <button
                      onClick={() => setMoveMenuOpenFor((prev) => (prev === doc.id ? null : doc.id))}
                      className="text-sm px-3 py-1.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white"
                    >
                      Move
                    </button>
                    {moveMenuOpenFor === doc.id && (
                      <div className="absolute top-full right-0 mt-1 bg-white dark:bg-app-surface border border-slate-200 dark:border-app-border rounded-md shadow-lg py-1 w-48 max-h-64 overflow-y-auto z-10">
                        {doc.folder_id !== null && (
                          <button
                            onClick={() => moveDocument(doc.id, null)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                          >
                            Root
                          </button>
                        )}
                        {folders
                          .filter((f) => f.id !== doc.folder_id)
                          .map((f) => (
                            <button
                              key={f.id}
                              onClick={() => moveDocument(doc.id, f.id)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 truncate"
                            >
                              {'—'.repeat(getFolderDepth(f.id, folders))} {f.name}
                            </button>
                          ))}
                        {folders.length === 0 && doc.folder_id === null && (
                          <p className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">No folders yet</p>
                        )}
                      </div>
                    )}
                  </div>
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