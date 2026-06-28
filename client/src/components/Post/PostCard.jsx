import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Trash2, Send, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import api from '../../services/api';
import toast from 'react-hot-toast';

// Reaction emoji map
const REACTIONS = ['❤️', '🔥', '😍', '😂', '😮', '👏'];

function AvatarPlaceholder({ username, size = 40 }) {
  return (
    <div
      className="avatar flex-shrink-0 font-bold text-sm"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.35,
        background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.2))',
      }}
    >
      {username?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

export default function PostCard({ post, onDelete, onUpdate }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [liked, setLiked] = useState(post.isLiked || false);
  const [likeCount, setLikeCount] = useState(post.likesCount || 0);
  const [saved, setSaved] = useState(post.isSaved || false);
  const [showReactions, setShowReactions] = useState(false);
  const [myReaction, setMyReaction] = useState(post.myReaction || null);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(post.comments || []);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);
  const heartRef = useRef(null);
  const reactionTimer = useRef(null);

  const timeAgo = post.createdAt
    ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })
    : '';

  // Double-tap to like
  const handleDoubleTap = useCallback(async () => {
    if (liked) return;
    setLiked(true);
    setLikeCount(c => c + 1);
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 400);
    try {
      await api.post(`/posts/${post._id}/like`);
    } catch {
      setLiked(false);
      setLikeCount(c => c - 1);
    }
  }, [liked, post._id]);

  const toggleLike = async () => {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount(c => wasLiked ? c - 1 : c + 1);
    if (!wasLiked) {
      setHeartAnim(true);
      setTimeout(() => setHeartAnim(false), 400);
    }
    try {
      await api.post(`/posts/${post._id}/like`);
    } catch {
      setLiked(wasLiked);
      setLikeCount(c => wasLiked ? c + 1 : c - 1);
    }
  };

  const handleReactionHover = () => {
    clearTimeout(reactionTimer.current);
    setShowReactions(true);
  };

  const handleReactionLeave = () => {
    reactionTimer.current = setTimeout(() => setShowReactions(false), 400);
  };

  const pickReaction = async (emoji) => {
    setMyReaction(prev => prev === emoji ? null : emoji);
    setShowReactions(false);
    if (!liked) { setLiked(true); setLikeCount(c => c + 1); }
    try {
      await api.post(`/posts/${post._id}/react`, { emoji });
    } catch {
      toast.error('Failed to react');
    }
  };

  const toggleSave = async () => {
    setSaved(s => !s);
    try {
      await api.post(`/posts/${post._id}/save`);
    } catch {
      setSaved(s => !s);
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      const { data } = await api.post(`/posts/${post._id}/comments`, { text: commentText.trim() });
      if (data.success) {
        setComments(prev => [...prev, data.comment]);
        setCommentText('');
      }
    } catch {
      toast.error('Failed to post comment');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await api.delete(`/posts/${post._id}`);
      toast.success('Post deleted');
      onDelete?.(post._id);
    } catch {
      toast.error('Failed to delete post');
    }
    setMenuOpen(false);
  };

  const isOwner = user?._id === post.author?._id || user?.id === post.author?._id;

  return (
    <article className="glass-card overflow-hidden fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => navigate(`/profile/${post.author?.username}`)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          {post.author?.avatar ? (
            <div className="avatar-ring w-10 h-10 flex-shrink-0">
              <img src={post.author.avatar} alt="" className="w-full h-full rounded-full object-cover" />
            </div>
          ) : (
            <AvatarPlaceholder username={post.author?.username} />
          )}
          <div className="text-left">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {post.author?.username}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo}</p>
          </div>
        </button>

        {isOwner && (
          <div className="relative">
            <button onClick={() => setMenuOpen(o => !o)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 w-40 rounded-xl overflow-hidden shadow-xl z-20 fade-in"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                <button onClick={handleDelete} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm" style={{ color: '#ec4899' }}>
                  <Trash2 className="w-4 h-4" /> Delete Post
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image */}
      {post.imageUrl && (
        <div className="relative" onDoubleClick={handleDoubleTap}>
          <img
            src={post.imageUrl}
            alt={post.caption || 'Post'}
            className="post-image max-h-[600px]"
            loading="lazy"
          />
          {/* Heart burst on double tap */}
          {heartAnim && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Heart className="w-20 h-20 heart-burst" style={{ color: '#ec4899', filter: 'drop-shadow(0 0 20px #ec4899)' }} fill="#ec4899" />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            {/* Like button with reaction picker */}
            <div className="relative" onMouseEnter={handleReactionHover} onMouseLeave={handleReactionLeave}>
              <button
                ref={heartRef}
                onClick={toggleLike}
                className="p-2 rounded-xl transition-all hover:scale-110"
              >
                <Heart
                  className={`w-6 h-6 transition-all ${heartAnim ? 'heart-burst' : ''}`}
                  style={{ color: liked ? '#ec4899' : 'var(--text-secondary)' }}
                  fill={liked ? '#ec4899' : 'none'}
                />
              </button>

              {/* Reaction picker */}
              {showReactions && (
                <div
                  className="absolute bottom-12 left-0 flex items-center gap-1 px-3 py-2 rounded-2xl shadow-2xl z-30 fade-in"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
                  onMouseEnter={handleReactionHover}
                  onMouseLeave={handleReactionLeave}
                >
                  {REACTIONS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => pickReaction(emoji)}
                      className="text-xl hover:scale-125 transition-transform p-1 rounded-lg"
                      style={{ background: myReaction === emoji ? 'rgba(139,92,246,0.2)' : 'transparent' }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowComments(o => !o)}
              className="p-2 rounded-xl transition-all hover:scale-110"
              style={{ color: 'var(--text-secondary)' }}
            >
              <MessageCircle className="w-6 h-6" />
            </button>

            <button
              onClick={() => navigate('/messages')}
              className="p-2 rounded-xl transition-all hover:scale-110"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Send className="w-6 h-6" />
            </button>
          </div>

          <button onClick={toggleSave} className="p-2 rounded-xl transition-all hover:scale-110">
            <Bookmark
              className="w-6 h-6"
              style={{ color: saved ? '#8b5cf6' : 'var(--text-secondary)' }}
              fill={saved ? '#8b5cf6' : 'none'}
            />
          </button>
        </div>

        {/* Like count */}
        <p className="text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
          {likeCount > 0 ? `${likeCount.toLocaleString()} like${likeCount !== 1 ? 's' : ''}` : 'Be the first to like'}
        </p>

        {/* Caption */}
        {post.caption && (
          <p className="text-sm leading-relaxed mb-1.5" style={{ color: 'var(--text-primary)' }}>
            <span className="font-semibold mr-1">{post.author?.username}</span>
            {post.caption}
          </p>
        )}

        {/* Reactions summary */}
        {myReaction && (
          <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>You reacted {myReaction}</p>
        )}

        {/* View comments */}
        {comments.length > 0 && !showComments && (
          <button onClick={() => setShowComments(true)} className="text-sm" style={{ color: 'var(--text-muted)' }}>
            View all {comments.length} comment{comments.length !== 1 ? 's' : ''}
          </button>
        )}

        {/* Comments section */}
        {showComments && (
          <div className="mt-3 fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Comments</span>
              <button onClick={() => setShowComments(false)} style={{ color: 'var(--text-muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
              {comments.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No comments yet</p>
              ) : (
                comments.map((c, i) => (
                  <div key={c._id || i} className="flex items-start gap-2">
                    <AvatarPlaceholder username={c.author?.username || c.user?.username} size={28} />
                    <div>
                      <span className="text-xs font-semibold mr-1.5" style={{ color: 'var(--text-primary)' }}>
                        {c.author?.username || c.user?.username}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{c.text}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={submitComment} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add a comment…"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                className="input-field py-2 text-sm flex-1"
                disabled={commentLoading}
              />
              <button type="submit" disabled={!commentText.trim() || commentLoading} className="btn-brand px-3 py-2 text-xs rounded-xl">
                Post
              </button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}
