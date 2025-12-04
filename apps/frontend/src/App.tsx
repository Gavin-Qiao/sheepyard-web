import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CalendarApp from './apps/calendar/CalendarApp';

interface User {
  id: number
  discord_id: string
  username: string
  avatar_url: string
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // We check health just for logging, not critical for UI flow
    fetch('/api/health')
      .then((res) => res.json())
      .catch((error) => console.error("Health check failed:", error));

    console.log("Fetching user profile...");
    fetch('/api/users/me')
      .then((res) => {
        if (res.ok) {
          return res.json()
        }
        if (res.status === 401) {
            console.log("User is not authenticated (401).");
            return null;
        }
        throw new Error('Unexpected error')
      })
      .then((data) => {
        if (data) {
             setUser(data)
        }
      })
      .catch((e) => {
         console.error("Error fetching user:", e);
         setUser(null)
      })
      .finally(() => {
          setAuthChecked(true);
      })
  }, [])

  if (!authChecked) {
      // Simple Loading State matching the theme
      return (
        <div className="min-h-screen w-full bg-[#FDFBF7] flex items-center justify-center">
            <div className="text-[#84A695] animate-pulse font-serif tracking-widest">LOADING...</div>
        </div>
      );
  }

  return (
    <Router>
        <Routes>
            <Route
                path="/login"
                element={user ? <Navigate to="/" replace /> : <Login />}
            />
            <Route
                path="/"
                element={user ? <Dashboard user={user} /> : <Navigate to="/login" replace />}
            />
            <Route
                path="/apps/calendar/*"
                element={user ? <CalendarApp /> : <Navigate to="/login" replace />}
            />
            {/* Catch all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </Router>
  )
}

export default App
