import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from './auth/store';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const setToken = useAuthStore((state) => state.setToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setToken(token);
    }
  }, [searchParams, setToken]);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // If no token in URL and not authenticated, redirect to login
  if (!searchParams.get('token')) {
      return <Navigate to="/login" replace />;
  }

  return <div className="flex justify-center items-center h-screen">Processing Login...</div>;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, fetchUser, user, isLoading } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && !user) {
        fetchUser();
    }
  }, [isAuthenticated, user, fetchUser]);

  if (isLoading) {
      return <div className="flex justify-center items-center h-screen">Loading User Data...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<AuthCallback />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        {/* Catch all redirect */}
         <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
