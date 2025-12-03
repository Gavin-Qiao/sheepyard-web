import { useEffect, useState } from 'react'

interface User {
  id: number
  discord_id: string
  username: string
  avatar_url: string
}

function App() {
  const [status, setStatus] = useState<string>('Loading...')
  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('Error fetching status'))

    fetch('/api/users/me')
      .then((res) => {
        if (res.ok) {
          return res.json()
        }
        throw new Error('Not authenticated')
      })
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoadingUser(false))
  }, [])

  const handleLogin = () => {
    window.location.href = '/api/auth/login'
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-4 text-gray-800 text-center">System Status</h1>
        <p className="text-gray-600 mb-6 text-center">
          Backend Status: <span className="font-semibold text-green-600">{status}</span>
        </p>

        <div className="border-t pt-6">
          {loadingUser ? (
            <p className="text-center text-gray-500">Checking authentication...</p>
          ) : user ? (
            <div className="flex flex-col items-center">
              {user.avatar_url && (
                <img
                  src={user.avatar_url}
                  alt={user.username}
                  className="w-16 h-16 rounded-full mb-2"
                />
              )}
              <h2 className="text-xl font-semibold text-gray-800">{user.username}</h2>
              <p className="text-sm text-gray-500 mb-4">Discord ID: {user.discord_id}</p>
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                Authenticated
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <p className="text-gray-600 mb-4 text-center">You are not logged in.</p>
              <button
                onClick={handleLogin}
                className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-2 px-6 rounded transition duration-200"
              >
                Login with Discord
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
