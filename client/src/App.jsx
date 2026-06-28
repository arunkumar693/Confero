import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import FeedPage from './pages/FeedPage';
import UploadPage from './pages/UploadPage';
import MessagesPage from './pages/MessagesPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import { Camera } from 'lucide-react';

const FullScreenLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--bg-primary)' }}>
    <div className="w-16 h-16 rounded-2xl flex items-center justify-center pulse-glow" style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899, #f97316)' }}>
      <Camera className="w-8 h-8 text-white" />
    </div>
    <div className="flex gap-1.5">
      <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, token, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!token || !user) return <Navigate to="/" replace />;
  return <SocketProvider>{children}</SocketProvider>;
};

const PublicRoute = ({ children }) => {
  const { user, token, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (token && user) return <Navigate to="/feed" replace />;
  return children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                backdropFilter: 'blur(20px)',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#8b5cf6', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ec4899', secondary: '#fff' } },
            }}
          />
          <Routes>
            <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
            <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
            <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
            <Route path="/messages/:userId" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
            <Route path="/profile/:username" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
