import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Video, Mail, Lock, User, LogIn, UserPlus, AlertCircle } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let res;
      if (isLogin) {
        res = await login(email, password);
      } else {
        if (username.length < 3) {
          setError('Username must be at least 3 characters');
          setLoading(false);
          return;
        }
        if (password.length < 8) {
          setError('Password must be at least 8 characters');
          setLoading(false);
          return;
        }
        res = await register(username, email, password);
      }

      if (res.success) {
        navigate('/');
      } else {
        setError(res.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setEmail('');
    setPassword('');
    setUsername('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background glow blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/20 border border-primary/30 mb-5 shadow-lg shadow-primary/20">
            <Video className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">Confero</h1>
          <p className="text-muted mt-2 text-base">Premium Video Collaboration Platform</p>
        </div>

        {/* Card */}
        <div className="glass-panel p-8">
          {/* Tab switcher */}
          <div className="flex rounded-xl bg-white/5 p-1 mb-8">
            <button
              onClick={() => { setIsLogin(true); switchMode(); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${isLogin ? 'bg-primary text-white shadow-md shadow-primary/30' : 'text-muted hover:text-white'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); switchMode(); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${!isLogin ? 'bg-primary text-white shadow-md shadow-primary/30' : 'text-muted hover:text-white'}`}
            >
              Create Account
            </button>
          </div>

          {/* Error alert */}
          {error && (
            <div className="flex items-start gap-3 bg-accent/10 border border-accent/30 text-accent px-4 py-3 rounded-xl mb-6 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Username</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    id="username"
                    type="text"
                    required
                    autoComplete="username"
                    placeholder="johndoe"
                    className="input-field pl-10"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-muted mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="input-field pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  placeholder={isLogin ? '••••••••' : 'Min. 8 characters'}
                  className="input-field pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <button
              id="auth-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  <span>{isLogin ? 'Signing in…' : 'Creating account…'}</span>
                </>
              ) : isLogin ? (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </>
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-muted">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={switchMode}
              className="text-primary hover:text-primary/80 font-semibold transition-colors"
              disabled={loading}
            >
              {isLogin ? 'Sign Up free' : 'Sign In'}
            </button>
          </p>
        </div>

        <p className="text-center mt-6 text-xs text-muted/60">
          Secured with JWT authentication & end-to-end encryption
        </p>
      </div>
    </div>
  );
}
