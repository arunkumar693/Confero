import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Layout/Navbar';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Send, Search, ArrowLeft, Circle, Smile } from 'lucide-react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import api from '../services/api';
import toast from 'react-hot-toast';

function formatMsgTime(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
}

function ConversationItem({ conv, isActive, currentUserId, onlineUsers, onClick }) {
  const other = conv.participants?.find(p => (p._id || p) !== currentUserId);
  const isOnline = onlineUsers?.includes(other?._id);
  const unread = conv.unreadCount || 0;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 transition-all text-left rounded-xl"
      style={{
        background: isActive ? 'rgba(139,92,246,0.12)' : 'transparent',
        borderLeft: isActive ? '2px solid #8b5cf6' : '2px solid transparent',
      }}
    >
      <div className="relative flex-shrink-0">
        {other?.avatar ? (
          <img src={other.avatar} alt="" className="w-11 h-11 rounded-full object-cover" />
        ) : (
          <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.3))', color: '#8b5cf6' }}>
            {other?.username?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        {isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
            style={{ background: '#10b981', borderColor: 'var(--bg-secondary)' }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {other?.username || 'Unknown'}
          </p>
          <span className="text-xs flex-shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>
            {formatMsgTime(conv.lastMessage?.createdAt)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
            {conv.lastMessage?.text || 'Start a conversation'}
          </p>
          {unread > 0 && (
            <span className="flex-shrink-0 ml-2 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: '#8b5cf6' }}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function ChatBubble({ msg, isOwn }) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={isOwn ? 'bubble-sent' : 'bubble-received'}>
        <p>{msg.text}</p>
        <p className="text-[10px] mt-1 opacity-60 text-right">
          {format(new Date(msg.createdAt || Date.now()), 'HH:mm')}
        </p>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { on, emit, onlineUsers } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch conversations
  useEffect(() => {
    const fetchConvs = async () => {
      try {
        const { data } = await api.get('/messages/conversations');
        if (data.success) setConversations(data.conversations || []);
      } catch {
        toast.error('Failed to load conversations');
      } finally {
        setLoadingConvs(false);
      }
    };
    fetchConvs();
  }, []);

  // Auto-open conversation from URL param
  useEffect(() => {
    if (userId && conversations.length > 0) {
      const conv = conversations.find(c =>
        c.participants?.some(p => (p._id || p) === userId)
      );
      if (conv) openConversation(conv);
    }
  }, [userId, conversations]);

  // Incoming socket messages
  useEffect(() => {
    const cleanup = on('message:new', (msg) => {
      if (msg.conversationId === activeConv?._id) {
        setMessages(prev => [...prev, msg]);
        scrollToBottom();
      }
      // Update conversation last message
      setConversations(prev => prev.map(c =>
        c._id === msg.conversationId ? { ...c, lastMessage: msg } : c
      ));
    });
    return cleanup;
  }, [on, activeConv, scrollToBottom]);

  const openConversation = async (conv) => {
    setActiveConv(conv);
    setShowMobileChat(true);
    setLoadingMsgs(true);
    setMessages([]);
    try {
      const { data } = await api.get(`/messages/${conv._id}`);
      if (data.success) setMessages(data.messages || []);
    } catch {
      toast.error('Failed to load messages');
    } finally {
      setLoadingMsgs(false);
      scrollToBottom();
      inputRef.current?.focus();
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeConv || sending) return;
    const msgText = text.trim();
    setText('');
    setSending(true);

    // Optimistic update
    const tempMsg = {
      _id: `temp-${Date.now()}`,
      text: msgText,
      sender: user?._id || user?.id,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };
    setMessages(prev => [...prev, tempMsg]);
    scrollToBottom();

    try {
      const { data } = await api.post(`/messages/${activeConv._id}`, { text: msgText });
      if (data.success) {
        setMessages(prev => prev.map(m => m._id === tempMsg._id ? data.message : m));
        emit('message:send', { conversationId: activeConv._id, message: data.message });
      }
    } catch {
      setMessages(prev => prev.filter(m => m._id !== tempMsg._id));
      toast.error('Failed to send message');
      setText(msgText);
    } finally {
      setSending(false);
    }
  };

  const filteredConvs = conversations.filter(c => {
    const other = c.participants?.find(p => (p._id || p) !== (user?._id || user?.id));
    return other?.username?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const activeOther = activeConv?.participants?.find(
    p => (p._id || p) !== (user?._id || user?.id)
  );
  const isActiveOnline = onlineUsers?.includes(activeOther?._id);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Navbar />

      <div className="max-w-5xl mx-auto px-0 md:px-4 pt-16 md:pt-20 h-screen md:h-auto">
        <div className="flex h-[calc(100vh-64px)] md:h-[calc(100vh-88px)] gap-0 md:gap-4 md:pt-4">

          {/* Conversations sidebar */}
          <div
            className={`flex flex-col border-r md:border md:rounded-2xl overflow-hidden ${showMobileChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-shrink-0`}
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>
                Messages
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search conversations…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="input-field pl-9 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {loadingConvs ? (
                <div className="flex items-center justify-center h-32">
                  <div className="spinner" />
                </div>
              ) : filteredConvs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No conversations yet</p>
                </div>
              ) : (
                filteredConvs.map(conv => (
                  <ConversationItem
                    key={conv._id}
                    conv={conv}
                    isActive={activeConv?._id === conv._id}
                    currentUserId={user?._id || user?.id}
                    onlineUsers={onlineUsers}
                    onClick={() => openConversation(conv)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Chat panel */}
          <div
            className={`flex flex-col flex-1 overflow-hidden md:border md:rounded-2xl ${showMobileChat ? 'flex' : 'hidden md:flex'}`}
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {activeConv ? (
              <>
                {/* Chat header */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="md:hidden p-1 rounded-lg mr-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="relative">
                    {activeOther?.avatar ? (
                      <img src={activeOther.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                        style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: 'white' }}>
                        {activeOther?.username?.[0]?.toUpperCase()}
                      </div>
                    )}
                    {isActiveOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                        style={{ background: '#10b981', borderColor: 'var(--bg-secondary)' }} />
                    )}
                  </div>
                  <div>
                    <button
                      onClick={() => navigate(`/profile/${activeOther?.username}`)}
                      className="text-sm font-bold hover:opacity-80"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {activeOther?.username}
                    </button>
                    <p className="text-xs flex items-center gap-1" style={{ color: isActiveOnline ? '#10b981' : 'var(--text-muted)' }}>
                      <Circle className="w-1.5 h-1.5" fill="currentColor" />
                      {isActiveOnline ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4">
                  {loadingMsgs ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="spinner" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                        style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: 'white' }}>
                        {activeOther?.username?.[0]?.toUpperCase()}
                      </div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {activeOther?.username}
                      </p>
                      <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                        Say hi! This is the beginning of your conversation.
                      </p>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg, i) => {
                        const isOwn = (msg.sender?._id || msg.sender) === (user?._id || user?.id);
                        return <ChatBubble key={msg._id || i} msg={msg} isOwn={isOwn} />;
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Input */}
                <div className="p-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <form onSubmit={sendMessage} className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Type a message…"
                      value={text}
                      onChange={e => setText(e.target.value)}
                      className="input-field py-3 flex-1 text-sm"
                      disabled={sending}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }}
                    />
                    <button
                      type="submit"
                      disabled={!text.trim() || sending}
                      className="btn-brand w-11 h-11 flex items-center justify-center rounded-xl flex-shrink-0"
                    >
                      {sending ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Send className="w-4 h-4" />}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)' }}>
                  <Send className="w-9 h-9" style={{ color: '#8b5cf6' }} />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Your Messages</h3>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Select a conversation to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
