import { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '../components/Layout/Navbar';
import PostCard from '../components/Post/PostCard';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Sparkles, RefreshCw, Users, TrendingUp } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

function StoriesRow({ suggestions }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="glass-card p-4 mb-5">
      <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {/* Your story */}
        <button
          onClick={() => navigate(`/profile/${user?.username}`)}
          className="flex flex-col items-center gap-1.5 flex-shrink-0"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full p-0.5" style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899, #f97316)' }}>
              <div className="w-full h-full rounded-full flex items-center justify-center text-lg font-bold"
                style={{ background: 'var(--bg-secondary)', color: '#8b5cf6' }}>
                {user?.username?.[0]?.toUpperCase() || 'Y'}
              </div>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}>+</div>
          </div>
          <span className="text-xs font-medium truncate w-16 text-center" style={{ color: 'var(--text-secondary)' }}>
            Your story
          </span>
        </button>

        {/* Suggestions */}
        {suggestions.map(u => (
          <button
            key={u._id}
            onClick={() => navigate(`/profile/${u.username}`)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0"
          >
            <div className="w-16 h-16 rounded-full p-0.5" style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899, #f97316)' }}>
              {u.avatar ? (
                <img src={u.avatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full flex items-center justify-center text-lg font-bold"
                  style={{ background: 'var(--bg-secondary)', color: '#8b5cf6' }}>
                  {u.username?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <span className="text-xs font-medium truncate w-16 text-center" style={{ color: 'var(--text-secondary)' }}>
              {u.username}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SuggestionsPanel({ suggestions, onFollow }) {
  const navigate = useNavigate();
  const [followed, setFollowed] = useState({});

  const handleFollow = async (userId) => {
    setFollowed(f => ({ ...f, [userId]: !f[userId] }));
    try {
      await api.post(`/users/${userId}/follow`);
      onFollow?.(userId);
    } catch {
      setFollowed(f => ({ ...f, [userId]: !f[userId] }));
    }
  };

  if (!suggestions.length) return null;

  return (
    <div className="glass-card p-5 sticky top-20">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4" style={{ color: '#8b5cf6' }} />
        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Suggested For You</h3>
      </div>
      <div className="space-y-3">
        {suggestions.slice(0, 5).map(u => (
          <div key={u._id} className="flex items-center gap-3">
            <button onClick={() => navigate(`/profile/${u.username}`)} className="flex-shrink-0">
              {u.avatar ? (
                <img src={u.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.2))', color: '#8b5cf6' }}>
                  {u.username?.[0]?.toUpperCase()}
                </div>
              )}
            </button>
            <div className="flex-1 min-w-0">
              <button onClick={() => navigate(`/profile/${u.username}`)}>
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{u.username}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{u.followersCount || 0} followers</p>
              </button>
            </div>
            <button
              onClick={() => handleFollow(u._id)}
              className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
              style={followed[u._id]
                ? { background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }
                : { background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)' }
              }
            >
              {followed[u._id] ? 'Following' : 'Follow'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);

  const fetchFeed = useCallback(async (pageNum = 1, append = false) => {
    try {
      const { data } = await api.get(`/posts/feed?page=${pageNum}&limit=10`);
      if (data.success) {
        const newPosts = data.posts || [];
        setPosts(prev => append ? [...prev, ...newPosts] : newPosts);
        setHasMore(newPosts.length === 10);
      }
    } catch {
      toast.error('Failed to load feed');
    }
  }, []);

  const fetchSuggestions = useCallback(async () => {
    try {
      const { data } = await api.get('/users/suggestions');
      if (data.success) setSuggestions(data.users || []);
    } catch {}
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchFeed(1), fetchSuggestions()]);
      setLoading(false);
    };
    init();
  }, [fetchFeed, fetchSuggestions]);

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    observerRef.current = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          setLoadingMore(true);
          fetchFeed(nextPage, true).finally(() => setLoadingMore(false));
        }
      },
      { threshold: 0.5 }
    );
    observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, page, fetchFeed]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await fetchFeed(1);
    setRefreshing(false);
    toast.success('Feed refreshed!');
  };

  const handleDelete = (postId) => {
    setPosts(prev => prev.filter(p => p._id !== postId));
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="spinner mx-auto mb-3" style={{ width: 32, height: 32, borderWidth: 3 }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading feed…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-6" style={{ background: 'var(--bg-primary)' }}>
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 pt-20 md:pt-24">
        <div className="flex gap-8">
          {/* Main feed */}
          <div className="flex-1 max-w-xl mx-auto md:mx-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" style={{ color: '#8b5cf6' }} />
                <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>
                  Your Feed
                </h1>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 rounded-xl transition-all hover:scale-105"
                style={{ color: 'var(--text-secondary)', background: 'var(--bg-card)' }}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Stories */}
            <StoriesRow suggestions={suggestions} />

            {/* Posts */}
            {posts.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No posts yet</h3>
                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                  Follow people to see their posts here, or be the first to post!
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {posts.map(post => (
                  <PostCard key={post._id} post={post} onDelete={handleDelete} />
                ))}

                {/* Infinite scroll sentinel */}
                <div ref={sentinelRef} className="h-4" />
                {loadingMore && (
                  <div className="text-center py-4">
                    <div className="spinner mx-auto" />
                  </div>
                )}
                {!hasMore && posts.length > 0 && (
                  <p className="text-center text-sm py-6" style={{ color: 'var(--text-muted)' }}>
                    You're all caught up! ✨
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            {/* User profile mini */}
            <div className="glass-card p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: 'white' }}>
                  {user?.avatar
                    ? <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                    : user?.username?.[0]?.toUpperCase()
                  }
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{user?.username}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
                </div>
              </div>
            </div>
            <SuggestionsPanel suggestions={suggestions} />
          </aside>
        </div>
      </div>
    </div>
  );
}
