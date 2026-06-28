import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Layout/Navbar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  User, Lock, Moon, Sun, LogOut, Camera, Save, Shield,
  Bell, Trash2, ChevronRight, Check,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)' }}>
        <Icon className="w-5 h-5" style={{ color: '#8b5cf6' }} />
      </div>
      <div>
        <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [activeSection, setActiveSection] = useState('profile');

  // Profile form
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
  const [profileSaving, setProfileSaving] = useState(false);

  // Password form
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passSaving, setPassSaving] = useState(false);

  // Notifications
  const [notifSettings, setNotifSettings] = useState({
    likes: true,
    comments: true,
    follows: true,
    messages: true,
  });

  const handleAvatarChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error('Please select an image'); return; }
    setAvatarFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const formData = new FormData();
      formData.append('username', username.trim());
      formData.append('bio', bio.trim());
      if (avatarFile) formData.append('avatar', avatarFile);

      const { data } = await api.put('/users/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data.success) {
        updateUser(data.user);
        toast.success('Profile updated!');
      } else {
        toast.error(data.message || 'Update failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (newPass !== confirmPass) { toast.error('Passwords do not match'); return; }
    if (newPass.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setPassSaving(true);
    try {
      const { data } = await api.put('/auth/change-password', {
        currentPassword: currentPass,
        newPassword: newPass,
      });
      if (data.success) {
        toast.success('Password changed!');
        setCurrentPass(''); setNewPass(''); setConfirmPass('');
      } else {
        toast.error(data.message || 'Password change failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPassSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/');
  };

  const menuItems = [
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'security', icon: Shield, label: 'Security' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'appearance', icon: theme === 'dark' ? Moon : Sun, label: 'Appearance' },
  ];

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: 'var(--bg-primary)' }}>
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 pt-20 md:pt-24">
        <h1 className="text-3xl font-black mb-6" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>
          Settings
        </h1>

        <div className="flex flex-col md:flex-row gap-5">
          {/* Sidebar menu */}
          <div className="w-full md:w-56 flex-shrink-0">
            <div className="glass-card p-2">
              {menuItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: activeSection === item.id ? 'rgba(139,92,246,0.12)' : 'transparent',
                    color: activeSection === item.id ? '#8b5cf6' : 'var(--text-secondary)',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>
              ))}

              <div className="border-t my-2" style={{ borderColor: 'var(--border-subtle)' }} />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-medium transition-all"
                style={{ color: '#ec4899' }}
              >
                <LogOut className="w-4 h-4" /> Log Out
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* Profile */}
            {activeSection === 'profile' && (
              <div className="glass-card p-6 fade-in">
                <SectionHeader icon={User} title="Edit Profile" subtitle="Update your public profile information" />

                <form onSubmit={saveProfile} className="space-y-5">
                  {/* Avatar upload */}
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full p-0.5" style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}>
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="" className="w-full h-full rounded-full object-cover" style={{ border: '3px solid var(--bg-secondary)' }} />
                        ) : (
                          <div className="w-full h-full rounded-full flex items-center justify-center text-2xl font-black"
                            style={{ background: 'var(--bg-secondary)', color: '#8b5cf6' }}>
                            {user?.username?.[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
                        style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}>
                        <Camera className="w-3.5 h-3.5 text-white" />
                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                      </label>
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Profile Photo</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>JPG, PNG up to 5MB</p>
                    </div>
                  </div>

                  <div>
                    <label className="label">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="input-field"
                      placeholder="johndoe"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Bio</label>
                    <textarea
                      value={bio}
                      onChange={e => setBio(e.target.value.slice(0, 160))}
                      placeholder="Tell people about yourself…"
                      rows={3}
                      className="input-field resize-none"
                    />
                    <p className="text-right text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{bio.length}/160</p>
                  </div>

                  <button type="submit" disabled={profileSaving} className="btn-brand px-6 py-3 text-sm rounded-xl flex items-center gap-2">
                    {profileSaving ? <><span className="spinner" /> Saving…</> : <><Save className="w-4 h-4" /> Save Changes</>}
                  </button>
                </form>
              </div>
            )}

            {/* Security */}
            {activeSection === 'security' && (
              <div className="glass-card p-6 fade-in">
                <SectionHeader icon={Lock} title="Security" subtitle="Change your password" />

                <form onSubmit={savePassword} className="space-y-4">
                  <div>
                    <label className="label">Current Password</label>
                    <input
                      type="password"
                      value={currentPass}
                      onChange={e => setCurrentPass(e.target.value)}
                      className="input-field"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">New Password</label>
                    <input
                      type="password"
                      value={newPass}
                      onChange={e => setNewPass(e.target.value)}
                      className="input-field"
                      placeholder="Min. 8 characters"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPass}
                      onChange={e => setConfirmPass(e.target.value)}
                      className="input-field"
                      placeholder="Repeat new password"
                      required
                    />
                    {newPass && confirmPass && (
                      <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: newPass === confirmPass ? '#10b981' : '#ec4899' }}>
                        {newPass === confirmPass ? <><Check className="w-3 h-3" /> Passwords match</> : '✗ Passwords do not match'}
                      </p>
                    )}
                  </div>
                  <button type="submit" disabled={passSaving} className="btn-brand px-6 py-3 text-sm rounded-xl flex items-center gap-2">
                    {passSaving ? <><span className="spinner" /> Changing…</> : <><Shield className="w-4 h-4" /> Change Password</>}
                  </button>
                </form>
              </div>
            )}

            {/* Notifications */}
            {activeSection === 'notifications' && (
              <div className="glass-card p-6 fade-in">
                <SectionHeader icon={Bell} title="Notifications" subtitle="Control what you get notified about" />
                <div className="space-y-4">
                  {Object.entries(notifSettings).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                      <div>
                        <p className="text-sm font-medium capitalize" style={{ color: 'var(--text-primary)' }}>{key}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {key === 'likes' && 'When someone likes your post'}
                          {key === 'comments' && 'When someone comments on your post'}
                          {key === 'follows' && 'When someone follows you'}
                          {key === 'messages' && 'When you receive a direct message'}
                        </p>
                      </div>
                      <button
                        onClick={() => setNotifSettings(s => ({ ...s, [key]: !s[key] }))}
                        className="w-12 h-6 rounded-full transition-all relative flex-shrink-0"
                        style={{ background: val ? 'linear-gradient(135deg, #8b5cf6, #ec4899)' : 'var(--bg-input)' }}
                      >
                        <span
                          className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                          style={{ left: val ? '26px' : '2px', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Appearance */}
            {activeSection === 'appearance' && (
              <div className="glass-card p-6 fade-in">
                <SectionHeader icon={theme === 'dark' ? Moon : Sun} title="Appearance" subtitle="Customize how SocialMini looks" />
                <div className="flex gap-4">
                  {['dark', 'light'].map(t => (
                    <button
                      key={t}
                      onClick={() => theme !== t && toggleTheme()}
                      className="flex-1 rounded-2xl p-5 text-center transition-all border-2"
                      style={{
                        background: t === 'dark' ? '#08080f' : '#f8f7ff',
                        borderColor: theme === t ? '#8b5cf6' : 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-center justify-center mb-3">
                        {t === 'dark'
                          ? <Moon className="w-6 h-6 text-purple-400" />
                          : <Sun className="w-6 h-6 text-yellow-500" />
                        }
                      </div>
                      <p className="text-sm font-semibold" style={{ color: t === 'dark' ? '#f0f0ff' : '#0f0f1a' }}>
                        {t === 'dark' ? 'Dark Mode' : 'Light Mode'}
                      </p>
                      {theme === t && (
                        <div className="mt-2 flex items-center justify-center gap-1 text-xs" style={{ color: '#8b5cf6' }}>
                          <Check className="w-3 h-3" /> Active
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
