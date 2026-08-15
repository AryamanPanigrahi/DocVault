import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const formData = new URLSearchParams()
    formData.append('username', email)
    formData.append('password', password)

    const response = await fetch('http://127.0.0.1:8000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    })

    if (!response.ok) {
      setError('Incorrect email or password')
      return
    }

    const data = await response.json()
    localStorage.setItem('access_token', data.access_token)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-white dark:bg-app-bg p-8">
  <form onSubmit={handleSubmit} className="bg-slate-100 dark:bg-app-surface p-4 rounded-lg flex items-center gap-4 border border-slate-200 dark:border-app-border">
    <h1 className="text-2xl text-slate-900 dark:text-white font-bold mb-2">Log in</h1>

    <input
      type="email"
      placeholder="Email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white p-2 rounded border border-slate-300 dark:border-slate-600"
    />

    <input
      type="password"
      placeholder="Password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white p-2 rounded border border-slate-300 dark:border-slate-600"
    />

    {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}

    <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-500">
      Log in
    </button>
  </form>
</div>
  )
}

export default Login