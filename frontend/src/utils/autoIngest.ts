import { readFile } from '@tauri-apps/plugin-fs'
import { API_URL } from '../config'
import { classifyContent } from './classifyContent'
import { getSweepNotesAssignments } from './watcherSettings'

interface UploadedDocument {
  id: number
  filename: string
  extracted_text: string | null
}

export type IngestResult =
  | { status: 'unauthorized' }
  | { status: 'failed' }
  | { status: 'removed'; filename: string }
  | { status: 'uploaded'; filename: string }

// Self-contained (no React state) so it can run from anywhere in the app,
// not just while a particular page happens to be mounted — the watcher
// needs to keep working regardless of which page you're looking at.
export async function autoIngestFile(
  path: string,
  mimeType: string | null
): Promise<IngestResult> {
  const token = localStorage.getItem('access_token')
  if (!token) return { status: 'failed' }

  // One retry after a short delay: the final filename can briefly exist in
  // a directory listing before its content is fully flushed (seen in
  // practice with real browser downloads), so the first read can 404.
  let bytes: Uint8Array
  try {
    bytes = await readFile(path)
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 300))
    try {
      bytes = await readFile(path)
    } catch (err) {
      console.error('Failed to read auto-detected file after retry', err)
      return { status: 'failed' }
    }
  }

  const filename = path.split(/[\\/]/).pop() ?? 'file'
  const file = new File([bytes as BlobPart], filename, mimeType ? { type: mimeType } : undefined)

  const formData = new FormData()
  formData.append('file', file)

  const uploadResponse = await fetch(`${API_URL}/documents/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })

  if (uploadResponse.status === 401) {
    localStorage.removeItem('access_token')
    return { status: 'unauthorized' }
  }

  if (!uploadResponse.ok) {
    console.error('Auto-ingest upload failed', uploadResponse.status)
    return { status: 'failed' }
  }

  const uploaded: UploadedDocument = await uploadResponse.json()

  const shouldRemove =
    classifyContent(uploaded.extracted_text) === 'notes_assignments' && !getSweepNotesAssignments()

  if (!shouldRemove) {
    return { status: 'uploaded', filename: uploaded.filename }
  }

  const deleteResponse = await fetch(`${API_URL}/documents/${uploaded.id}/permanent`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (deleteResponse.status === 401) {
    localStorage.removeItem('access_token')
    return { status: 'unauthorized' }
  }

  if (!deleteResponse.ok) {
    console.error('Auto-reject permanent delete failed', deleteResponse.status)
    return { status: 'uploaded', filename: uploaded.filename }
  }

  return { status: 'removed', filename: uploaded.filename }
}
