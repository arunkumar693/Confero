import { NavLink, useNavigate } from 'react-router-dom';
import { Home, PlusSquare, MessageCircle, User, Camera, Sun, Moon, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const navItems = [
    { to: '/feed', icon: Home, label: 'Feed' },
    { to: '/upload', icon: PlusSquare, label: 'Post' },
    { to: '/messages', icon: MessageCircle, label: 'Messages' },
  ];

  const activeStyle = {
    color: '#8b5cf6',
  };
  const inactiveStyle = {
    color: 'var(--text-secondary)',
  };

  return (
    <>
      {/* Desktop top bar */}
      <header className="fixed top-0 left-0 right-0 z-40 hidden md:flex items-center justify-between px-6 py-3.5 border-b"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', backdropFilter: 'blur(20px)' }}>
        {/* Logo */}
        <button onClick={() => navigate('/feed')} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899, #f97316)' }}>
            <Camera className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <span className="gradient-text">Social</span>
            <span style={{ color: 'var(--text-primary)' }}>Mini</span>
          </span>
        </button>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
              style={({ isActive }) => ({
                ...(isActive ? activeStyle : inactiveStyle),
                background: 'transparent',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon className="w-5 h-5" style={isActive ? activeStyle : inactiveStyle} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-card)' }}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Avatar + dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: 'white' }}
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                user?.username?.[0]?.toUpperCase() || 'U'
              )}
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-12 w-52 rounded-2xl overflow-hidden shadow-2xl fade-in"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', zIndex: 100 }}
              >
                <div className="p-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>@{user?.username}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
                </div>
                <div className="p-1.5">
                  <button
                    onClick={() => { navigate(`/profile/${user?.username}`); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm hover:bg-opacity-10 transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <User className="w-4 h-4" style={{ color: '#8b5cf6' }} /> View Profile
                  </button>
                  <button
                    onClick={() => { navigate('/settings'); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <Settings className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /> Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors"
                    style={{ color: '#ec4899' }}
                  >
                    <LogOut className="w-4 h-4" /> Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav md:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {[
            { to: '/feed', icon: Home },
            { to: '/upload', icon: PlusSquare },
            { to: '/messages', icon: MessageCircle },
            { to: `/profile/${user?.username}`, icon: User },
          ].map(({ to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className="flex flex-col items-center p-2.5 rounded-xl transition-all"
            >
              {({ isActive }) => (
                <Icon
                  className="w-6 h-6 transition-all"
                  style={isActive ? { color: '#8b5cf6', filter: 'drop-shadow(0 0 6px rgba(139,92,246,0.5))' } : { color: 'var(--text-muted)' }}
                />
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
