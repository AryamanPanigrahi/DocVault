import { readFile } from '@tauri-apps/plugin-fs'
import { API_URL } from '../config'
import { autoOrganizeDocument } from './autoOrganize'

interface UploadedDocument {
  id: number
  filename: string
  extracted_text: string | null
}

export type IngestResult =
  | { status: 'unauthorized' }
  | { status: 'failed' }
  | { status: 'removed'; filename: string }
  | { status: 'moved'; filename: string; folderName: string }
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

  // The watcher always uploads to root (it has no concept of "the folder
  // you're currently browsing"), so auto-organize always applies here —
  // unlike manual uploads, where an explicit folder choice skips it.
  const result = await autoOrganizeDocument(uploaded)

  switch (result.action) {
    case 'unauthorized':
      localStorage.removeItem('access_token')
      return { status: 'unauthorized' }
    case 'deleted':
      return { status: 'removed', filename: uploaded.filename }
    case 'moved':
      return { status: 'moved', filename: uploaded.filename, folderName: result.folderName }
    case 'kept':
      return { status: 'uploaded', filename: uploaded.filename }
  }
}
