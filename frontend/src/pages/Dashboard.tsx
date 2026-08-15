import { useEffect, useState } from 'react'

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

  useEffect(() => {
    async function fetchDocuments() {
      const token = localStorage.getItem('access_token')

      const response = await fetch('http://127.0.0.1:8000/documents', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setDocuments(data)
      }

      setLoading(false)
    }

    fetchDocuments()
  }, [])

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <h1 className="text-3xl text-white font-bold mb-6">Your Documents</h1>

      {loading && <p className="text-slate-400">Loading...</p>}

      {!loading && documents.length === 0 && (
        <p className="text-slate-400">No documents yet.</p>
      )}

      <div className="flex flex-col gap-2">
        {documents.map((doc) => (
          <div key={doc.id} className="bg-slate-800 p-4 rounded flex justify-between items-center">
            <div>
              <p className="text-white">{doc.filename}</p>
              <p className="text-slate-400 text-sm">
                {doc.content_type} · {doc.size_bytes} bytes
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Dashboard