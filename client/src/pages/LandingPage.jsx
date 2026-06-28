import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Heart, MessageCircle, Sparkles, Users, Zap, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMouse({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const parallaxStyle = (depth = 1) => ({
    transform: `translate(${(mouse.x - 0.5) * depth * 30}px, ${(mouse.y - 0.5) * depth * 30}px)`,
    transition: 'transform 0.2s ease-out',
  });

  const features = [
    { icon: Camera, label: 'Share Moments', desc: 'Post photos with captions and reactions', color: '#8b5cf6' },
    { icon: Heart, label: 'React & Like', desc: 'Express yourself with emoji reactions', color: '#ec4899' },
    { icon: MessageCircle, label: 'Real-time DMs', desc: 'Chat live with friends via Socket.io', color: '#f97316' },
    { icon: Users, label: 'Follow People', desc: 'Build your community and social graph', color: '#06b6d4' },
    { icon: Zap, label: 'Lightning Fast', desc: 'Optimized for speed and performance', color: '#f59e0b' },
    { icon: Sparkles, label: 'Secure Auth', desc: 'Email OTP 2FA protects your account', color: '#10b981' },
  ];

  return (
    <div className="min-h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Animated background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full blur-3xl opacity-20"
          style={{
            width: '600px', height: '600px',
            background: 'radial-gradient(circle, #8b5cf6, transparent)',
            top: '-100px', left: '-100px',
            ...parallaxStyle(0.5),
          }}
        />
        <div
          className="absolute rounded-full blur-3xl opacity-15"
          style={{
            width: '500px', height: '500px',
            background: 'radial-gradient(circle, #ec4899, transparent)',
            bottom: '-50px', right: '-50px',
            ...parallaxStyle(-0.3),
          }}
        />
        <div
          className="absolute rounded-full blur-3xl opacity-10"
          style={{
            width: '400px', height: '400px',
            background: 'radial-gradient(circle, #f97316, transparent)',
            top: '50%', left: '50%',
            transform: `translate(-50%, -50%) translate(${(mouse.x - 0.5) * 20}px, ${(mouse.y - 0.5) * 20}px)`,
            transition: 'transform 0.3s ease-out',
          }}
        />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899, #f97316)' }}>
            <Camera className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <span className="gradient-text">Social</span>
            <span style={{ color: 'var(--text-primary)' }}>Mini</span>
          </span>
        </div>
        <button
          id="landing-signin-btn"
          onClick={() => navigate('/auth')}
          className="btn-outline px-5 py-2.5 text-sm"
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-16 pb-24">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8 fade-in" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: '#a78bfa' }}>
          <Sparkles className="w-4 h-4" />
          CodeAlpha Portfolio Project
        </div>

        <h1
          className="text-6xl md:text-8xl font-black leading-none mb-6 fade-in"
          style={{ fontFamily: 'Outfit, sans-serif', animationDelay: '0.1s' }}
        >
          <span className="gradient-text">Social</span>
          <br />
          <span style={{ color: 'var(--text-primary)' }}>Mini</span>
        </h1>

        <p
          className="text-lg md:text-xl max-w-xl mb-10 fade-in leading-relaxed"
          style={{ color: 'var(--text-secondary)', animationDelay: '0.2s' }}
        >
          Share moments. Build connections. A full-stack Instagram-inspired experience built with React, Node.js, and real-time magic.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 fade-in" style={{ animationDelay: '0.3s' }}>
          <button
            id="landing-get-started-btn"
            onClick={() => navigate('/auth')}
            className="btn-brand px-8 py-4 text-base flex items-center gap-2 rounded-xl"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
            className="btn-outline px-8 py-4 text-base rounded-xl"
          >
            Explore Features
          </button>
        </div>

        {/* Floating UI mockup cards */}
        <div className="relative mt-20 w-full max-w-2xl mx-auto fade-in" style={{ animationDelay: '0.4s' }}>
          {/* Center card */}
          <div className="glass-card p-4 mx-auto w-72" style={parallaxStyle(0.2)}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full" style={{ background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', padding: '2px' }}>
                <div className="w-full h-full rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: 'var(--bg-secondary)' }}>S</div>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>socialmini_dev</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Just now</p>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden mb-3 h-40 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.3),rgba(236,72,153,0.3))' }}>
              <Camera className="w-10 h-10" style={{ color: 'rgba(139,92,246,0.6)' }} />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <Heart className="w-4 h-4" style={{ color: '#ec4899' }} fill="#ec4899" /> 248
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <MessageCircle className="w-4 h-4" /> 32
              </div>
              <div className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>❤️ 🔥 😍</div>
            </div>
          </div>

          {/* Floating stat cards */}
          <div
            className="glass-card absolute -left-8 top-8 px-4 py-3 items-center gap-3 rounded-xl hidden md:flex"
            style={parallaxStyle(-0.4)}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.2)' }}>
              <Users className="w-4 h-4" style={{ color: '#8b5cf6' }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>1.2k</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Followers</p>
            </div>
          </div>

          <div
            className="glass-card absolute -right-8 top-16 px-4 py-3 items-center gap-3 rounded-xl hidden md:flex"
            style={parallaxStyle(0.6)}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(236,72,153,0.2)' }}>
              <Heart className="w-4 h-4" style={{ color: '#ec4899' }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>8.4k</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Likes</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>
            Everything you need
          </h2>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>A complete social experience in one platform</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={f.label}
              className="glass-card p-6 slide-up"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${f.color}1a`, border: `1px solid ${f.color}30` }}
              >
                <f.icon className="w-6 h-6" style={{ color: f.color }} />
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{f.label}</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 text-center px-6 py-24">
        <div className="max-w-2xl mx-auto glass-card p-12">
          <h2 className="text-4xl font-black mb-4 gradient-text" style={{ fontFamily: 'Outfit, sans-serif' }}>Ready to share?</h2>
          <p className="mb-8 text-base" style={{ color: 'var(--text-secondary)' }}>Join SocialMini and start posting your moments today.</p>
          <button
            id="landing-cta-btn"
            onClick={() => navigate('/auth')}
            className="btn-brand px-10 py-4 text-base rounded-xl"
          >
            Create Free Account
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 text-center pb-8 px-6">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          SocialMini &bull; Built by Arun Kumar &bull; CodeAlpha Internship Portfolio &bull; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
