import { useEffect, useState } from 'react'

function App() {
  const [status, setStatus] = useState<string>('Loading...')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch((err) => setStatus('Error fetching status'))
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">System Status</h1>
        <p className="text-gray-600">
          Backend Status: <span className="font-semibold text-green-600">{status}</span>
        </p>
      </div>
    </div>
  )
}

export default App
