import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { isTauri } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { autoIngestFile } from '../utils/autoIngest'

interface DetectedFile {
  path: string
  mime_type: string | null
  category: 'notes_assignments' | 'general'
}

// Rendered once at the app root (see App.tsx), outside any <Route> — a
// background watcher can't be tied to which page happens to be mounted,
// so this must live for the whole app session, not just while Dashboard
// is showing.
function DesktopWatcher() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isTauri()) return

    const unlistenPromise = listen<DetectedFile>('file-detected', async (event) => {
      const { path, mime_type } = event.payload
      const result = await autoIngestFile(path, mime_type)
      if (result.status === 'unauthorized') {
        navigate('/login')
      }
    })

    // Chained off the promise itself, not a variable assigned once it
    // resolves — React can unmount before listen() resolves, so a plain
    // `let unlisten` closure would still be undefined at cleanup time and
    // silently leak the listener.
    return () => {
      unlistenPromise.then((unlisten) => unlisten())
    }
  }, [navigate])

  return null
}

export default DesktopWatcher
