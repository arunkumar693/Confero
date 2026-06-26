import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Video, LogOut, Users, Plus, ArrowRight, Copy, Check } from 'lucide-react';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [copied, setCopied] = useState(false);
  const [joinError, setJoinError] = useState('');

  const generateRoomId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 9 }, (_, i) => {
      if (i === 3 || i === 6) return '-';
      return chars[Math.floor(Math.random() * chars.length)];
    }).join('');
  };

  const [pendingRoom] = useState(() => generateRoomId());

  const handleCreateRoom = () => {
    navigate(`/room/${pendingRoom}`);
  };

  const handleCopyRoomId = async () => {
    await navigator.clipboard.writeText(pendingRoom);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    const trimmed = roomId.trim();
    if (!trimmed) {
      setJoinError('Please enter a Room ID');
      return;
    }
    navigate(`/room/${trimmed}`);
  };

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-5xl mx-auto">
      {/* Fixed background glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 w-[600px] h-[400px] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-secondary/8 blur-3xl" />
      </div>

      {/* Header */}
      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-primary/20 border border-primary/30 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Video className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Confero</h1>
            <p className="text-xs text-muted">Video Collaboration</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-medium text-white">{user?.username}</span>
            <span className="text-xs text-muted">{user?.email}</span>
          </div>
          <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <button
            id="logout-btn"
            onClick={logout}
            className="btn-secondary flex items-center gap-2 text-sm py-2 px-3"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Welcome */}
      <div className="mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Welcome back, <span className="text-primary">{user?.username}</span> 👋
        </h2>
        <p className="text-muted text-base">Start or join a video meeting instantly — no downloads required.</p>
      </div>

      {/* Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Create Room Card */}
        <div className="glass-panel p-8 flex flex-col">
          <div className="w-14 h-14 bg-primary/15 border border-primary/20 rounded-2xl flex items-center justify-center mb-6">
            <Plus className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">New Meeting</h3>
          <p className="text-muted text-sm mb-6 flex-1">Start an instant video meeting. Share the Room ID with others to invite them.</p>

          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-5 flex items-center justify-between">
            <span className="text-white font-mono text-sm tracking-wider">{pendingRoom}</span>
            <button
              id="copy-room-id"
              onClick={handleCopyRoomId}
              className="text-muted hover:text-white transition-colors ml-3"
              title="Copy Room ID"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <button
            id="create-room-btn"
            onClick={handleCreateRoom}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2"
          >
            <Video className="w-4 h-4" />
            Start Meeting
          </button>
        </div>

        {/* Join Room Card */}
        <div className="glass-panel p-8 flex flex-col">
          <div className="w-14 h-14 bg-secondary/15 border border-secondary/20 rounded-2xl flex items-center justify-center mb-6">
            <Users className="w-7 h-7 text-secondary" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Join Meeting</h3>
          <p className="text-muted text-sm mb-6 flex-1">Enter a Room ID provided by the meeting host to join their session.</p>

          <form onSubmit={handleJoinRoom} className="mt-auto">
            <div className="mb-3">
              <input
                id="room-id-input"
                type="text"
                placeholder="Enter Room ID (e.g. abc-123-xyz)"
                className="input-field"
                value={roomId}
                onChange={(e) => { setRoomId(e.target.value); setJoinError(''); }}
              />
              {joinError && <p className="text-accent text-xs mt-1.5 ml-1">{joinError}</p>}
            </div>
            <button
              id="join-room-btn"
              type="submit"
              className="btn-secondary w-full py-3 flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              Join Meeting
            </button>
          </form>
        </div>
      </div>

      {/* Footer hint */}
      <p className="text-center text-xs text-muted/50 mt-10">
        Rooms are end-to-end encrypted via WebRTC · No data stored on our servers
      </p>
    </div>
  );
}
