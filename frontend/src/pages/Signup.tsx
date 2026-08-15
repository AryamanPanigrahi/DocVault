import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const response = await fetch('http://127.0.0.1:8000/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const data = await response.json()
      setError(data.detail || 'Signup failed')
      return
    }

    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-slate-800 p-8 rounded-lg w-80 flex flex-col gap-4">
        <h1 className="text-2xl text-white font-bold mb-2">Sign up</h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-slate-700 text-white p-2 rounded"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-slate-700 text-white p-2 rounded"
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-500">
          Sign up
        </button>
      </form>
    </div>
  )
}

export default Signup