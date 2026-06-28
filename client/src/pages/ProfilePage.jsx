import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Layout/Navbar';
import PostCard from '../components/Post/PostCard';
import { useAuth } from '../context/AuthContext';
import { Grid, List, Settings, MessageCircle, UserPlus, UserMinus, Camera } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

function StatBox({ value, label }) {
  return (
    <div className="text-center">
      <p className="text-xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}

export default function ProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'feed'
  const [selectedPost, setSelectedPost] = useState(null);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'saved'
  const [savedPosts, setSavedPosts] = useState([]);

  const isOwnProfile = currentUser?.username === username;

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, postsRes] = await Promise.all([
        api.get(`/users/profile/${username}`),
        api.get(`/posts/user/${username}`),
      ]);
      if (profileRes.data.success) {
        setProfile(profileRes.data.user);
        setFollowing(profileRes.data.user.isFollowing || false);
      }
      if (postsRes.data.success) {
        setPosts(postsRes.data.posts || []);
      }
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const fetchSaved = useCallback(async () => {
    if (!isOwnProfile) return;
    try {
      const { data } = await api.get('/posts/saved');
      if (data.success) setSavedPosts(data.posts || []);
    } catch {}
  }, [isOwnProfile]);

  useEffect(() => {
    if (activeTab === 'saved') fetchSaved();
  }, [activeTab, fetchSaved]);

  const toggleFollow = async () => {
    setFollowLoading(true);
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    setProfile(p => p ? {
      ...p,
      followersCount: wasFollowing ? p.followersCount - 1 : p.followersCount + 1,
    } : p);
    try {
      await api.post(`/users/${profile._id}/follow`);
    } catch {
      setFollowing(wasFollowing);
      setProfile(p => p ? {
        ...p,
        followersCount: wasFollowing ? p.followersCount + 1 : p.followersCount - 1,
      } : p);
      toast.error('Failed to update follow');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleDeletePost = (postId) => {
    setPosts(prev => prev.filter(p => p._id !== postId));
    setSelectedPost(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <Navbar />
        <div className="flex flex-col items-center justify-center h-screen gap-4">
          <Camera className="w-16 h-16" style={{ color: 'var(--text-muted)' }} />
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>User not found</h2>
          <button onClick={() => navigate('/feed')} className="btn-brand px-6 py-2.5 rounded-xl text-sm">
            Back to Feed
          </button>
        </div>
      </div>
    );
  }

  const displayPosts = activeTab === 'saved' ? savedPosts : posts;

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: 'var(--bg-primary)' }}>
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 pt-20 md:pt-24">
        {/* Profile header */}
        <div className="glass-card p-6 md:p-8 mb-6 fade-in">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full p-0.5" style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899, #f97316)' }}>
                {profile.avatar ? (
                  <img src={profile.avatar} alt="" className="w-full h-full rounded-full object-cover" style={{ border: '3px solid var(--bg-secondary)' }} />
                ) : (
                  <div className="w-full h-full rounded-full flex items-center justify-center text-3xl font-black"
                    style={{ background: 'var(--bg-secondary)', color: '#8b5cf6' }}>
                    {profile.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>
                  {profile.username}
                </h1>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  {isOwnProfile ? (
                    <button
                      onClick={() => navigate('/settings')}
                      className="btn-outline flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl"
                    >
                      <Settings className="w-4 h-4" /> Edit Profile
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={toggleFollow}
                        disabled={followLoading}
                        className={following ? 'btn-outline flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl' : 'btn-brand flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl'}
                      >
                        {followLoading ? <span className="spinner" style={{ width: 14, height: 14 }} /> :
                          following ? <><UserMinus className="w-4 h-4" /> Unfollow</> : <><UserPlus className="w-4 h-4" /> Follow</>
                        }
                      </button>
                      <button
                        onClick={() => navigate('/messages')}
                        className="btn-outline flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl"
                      >
                        <MessageCircle className="w-4 h-4" /> Message
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-center sm:justify-start gap-8 mb-4">
                <StatBox value={posts.length} label="Posts" />
                <StatBox value={profile.followersCount || 0} label="Followers" />
                <StatBox value={profile.followingCount || 0} label="Following" />
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {profile.bio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b mb-4" style={{ borderColor: 'var(--border-subtle)' }}>
          {[
            { id: 'posts', label: 'Posts' },
            ...(isOwnProfile ? [{ id: 'saved', label: 'Saved' }] : []),
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-5 py-3 text-sm font-semibold border-b-2 transition-all"
              style={{
                borderColor: activeTab === tab.id ? '#8b5cf6' : 'transparent',
                color: activeTab === tab.id ? '#8b5cf6' : 'var(--text-muted)',
              }}
            >
              {tab.label}
            </button>
          ))}

          {/* View mode toggle */}
          <div className="ml-auto flex items-center gap-1 pb-1">
            {[
              { mode: 'grid', Icon: Grid },
              { mode: 'feed', Icon: List },
            ].map(({ mode, Icon }) => (
              <button
                key={mode}
                onClick={() => { setViewMode(mode); setSelectedPost(null); }}
                className="p-2 rounded-lg transition-colors"
                style={{ color: viewMode === mode ? '#8b5cf6' : 'var(--text-muted)' }}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>

        {/* Post grid */}
        {viewMode === 'grid' ? (
          <>
            {displayPosts.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Camera className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No posts yet</p>
                {isOwnProfile && (
                  <button onClick={() => navigate('/upload')} className="btn-brand mt-4 px-5 py-2.5 text-sm rounded-xl">
                    Share your first post
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="posts-grid">
                  {displayPosts.map(post => (
                    <div key={post._id} className="posts-grid-item" onClick={() => setSelectedPost(post)}>
                      {post.imageUrl ? (
                        <img src={post.imageUrl} alt={post.caption || ''} loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-card)' }}>
                          <Camera className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
                        </div>
                      )}
                      <div className="overlay">
                        <span>❤️ {post.likesCount || 0}</span>
                        <span>💬 {post.commentsCount || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Post modal */}
                {selectedPost && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
                    onClick={() => setSelectedPost(null)}
                  >
                    <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl" onClick={e => e.stopPropagation()}>
                      <PostCard post={selectedPost} onDelete={handleDeletePost} />
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <div className="space-y-5">
            {displayPosts.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Camera className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No posts yet</p>
              </div>
            ) : (
              displayPosts.map(post => (
                <PostCard key={post._id} post={post} onDelete={handleDeletePost} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
