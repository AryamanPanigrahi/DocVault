import { API_URL } from '../config'
import { classifyContent } from './classifyContent'
import { getSweepNotesAssignments } from './watcherSettings'

interface Folder {
  id: number
  name: string
  parent_id: number | null
  auto_keywords: string | null
}

interface OrganizableDocument {
  id: number
  filename: string
  extracted_text: string | null
}

export type OrganizeResult =
  | { action: 'moved'; folderName: string }
  | { action: 'deleted' }
  | { action: 'kept' }
  | { action: 'unauthorized' }

const DEFAULT_NOTES_FOLDER_NAME = 'Notes & Assignments'

function matchesFolder(doc: OrganizableDocument, folder: Folder): boolean {
  if (!folder.auto_keywords) return false
  const keywords = folder.auto_keywords
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean)
  if (keywords.length === 0) return false

  const haystack = `${doc.filename} ${doc.extracted_text ?? ''}`.toLowerCase()
  return keywords.some((kw) => haystack.includes(kw))
}

async function fetchFolders(token: string): Promise<Folder[] | 'unauthorized'> {
  const response = await fetch(`${API_URL}/folders`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (response.status === 401) return 'unauthorized'
  if (!response.ok) return []
  return response.json()
}

async function getOrCreateFolder(name: string, folders: Folder[], token: string): Promise<number | null> {
  const existing = folders.find((f) => f.name === name && f.parent_id === null)
  if (existing) return existing.id

  const response = await fetch(`${API_URL}/folders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parent_id: null }),
  })
  if (!response.ok) return null
  const created = await response.json()
  return created.id
}

async function moveDocument(id: number, folderId: number, token: string): Promise<boolean> {
  const response = await fetch(`${API_URL}/documents/${id}/move`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder_id: folderId }),
  })
  return response.ok
}

async function permanentlyDelete(id: number, token: string): Promise<boolean> {
  const response = await fetch(`${API_URL}/documents/${id}/permanent`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.ok
}

// Runs after any upload that landed at root (no folder chosen) — an
// explicit folder choice (uploading while browsing a specific folder)
// always wins and skips this entirely, since auto-organizing something
// you deliberately placed somewhere would be surprising, not helpful.
//
// Priority order: user-defined folder rules (auto_keywords) first, since
// they're an explicit, intentional choice the user made about their own
// taxonomy — then the one built-in default classifier (notes/assignments)
// as a fallback for what's otherwise unsorted.
export async function autoOrganizeDocument(doc: OrganizableDocument): Promise<OrganizeResult> {
  const token = localStorage.getItem('access_token')
  if (!token) return { action: 'kept' }

  const folders = await fetchFolders(token)
  if (folders === 'unauthorized') return { action: 'unauthorized' }

  const ruleMatch = folders.find((f) => matchesFolder(doc, f))
  if (ruleMatch) {
    const moved = await moveDocument(doc.id, ruleMatch.id, token)
    return moved ? { action: 'moved', folderName: ruleMatch.name } : { action: 'kept' }
  }

  if (classifyContent(doc.extracted_text) !== 'notes_assignments') {
    return { action: 'kept' }
  }

  if (!getSweepNotesAssignments()) {
    const deleted = await permanentlyDelete(doc.id, token)
    return deleted ? { action: 'deleted' } : { action: 'kept' }
  }

  const folderId = await getOrCreateFolder(DEFAULT_NOTES_FOLDER_NAME, folders, token)
  if (folderId === null) return { action: 'kept' }

  const moved = await moveDocument(doc.id, folderId, token)
  return moved ? { action: 'moved', folderName: DEFAULT_NOTES_FOLDER_NAME } : { action: 'kept' }
}
