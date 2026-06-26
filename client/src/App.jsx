import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import RoomPage from './pages/RoomPage';
import { Video } from 'lucide-react';

const FullScreenLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4">
    <div className="w-16 h-16 bg-primary/20 border border-primary/30 rounded-2xl flex items-center justify-center animate-pulse">
      <Video className="w-8 h-8 text-primary" />
    </div>
    <div className="flex gap-1.5">
      <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, token, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!token || !user) return <Navigate to="/auth" replace />;
  return <SocketProvider>{children}</SocketProvider>;
};

const PublicRoute = ({ children }) => {
  const { user, token, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (token && user) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/auth" element={
            <PublicRoute>
              <AuthPage />
            </PublicRoute>
          } />
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          <Route path="/room/:roomId" element={
            <ProtectedRoute>
              <RoomPage />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
