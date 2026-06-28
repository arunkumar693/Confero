import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Camera, Mail, Lock, User, ArrowRight, RefreshCw, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

// 6-digit OTP input component
function OTPInput({ value, onChange, disabled }) {
  const inputsRef = useRef([]);
  const digits = value.split('');

  const handleChange = (index, e) => {
    const val = e.target.value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = val;
    onChange(next.join(''));
    if (val && index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted.padEnd(6, '').slice(0, 6));
    inputsRef.current[Math.min(pasted.length, 5)]?.focus();
    e.preventDefault();
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={el => inputsRef.current[i] = el}
          id={`otp-input-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ''}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          disabled={disabled}
          className="otp-input"
        />
      ))}
    </div>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { register, loginStep1, loginStep2 } = useAuth();

  // 'login' | 'signup' | 'otp'
  const [mode, setMode] = useState('login');
  const [pendingEmail, setPendingEmail] = useState('');
  const [otpPurpose, setOtpPurpose] = useState('login');

  // Form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const switchMode = (m) => {
    setMode(m);
    setUsername(''); setEmail(''); setPassword(''); setOtp('');
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signup') {
        const res = await register(username, email, password);
        if (res.success) {
          setPendingEmail(email);
          setOtpPurpose('signup');
          setMode('otp');
          setResendCooldown(60);
          toast.success('Verification code sent to your email!');
        } else {
          toast.error(res.message || 'Registration failed');
        }
      } else {
        const res = await loginStep1(email, password);
        if (res.requiresOTP) {
          setPendingEmail(email);
          setOtpPurpose('login');
          setMode('otp');
          setResendCooldown(60);
          toast.success('Login code sent to your email!');
        } else if (res.success && res.token) {
          navigate('/feed');
        } else {
          toast.error(res.message || 'Login failed');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    if (otp.length < 6) { toast.error('Please enter all 6 digits'); return; }
    setLoading(true);
    try {
      if (otpPurpose === 'signup') {
        const { default: api } = await import('../services/api');
        const r = await api.post('/otp/verify', { email: pendingEmail, otp, purpose: 'signup' });
        const res = r.data;
        if (res.success) {
          toast.success('Email verified! Please log in.');
          switchMode('login');
          setEmail(pendingEmail);
        } else {
          toast.error(res.message);
        }
      } else {
        const res = await loginStep2(pendingEmail, otp);
        if (res.success) {
          toast.success('Welcome back! 🎉');
          navigate('/feed');
        } else {
          toast.error(res.message || 'Invalid OTP');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    try {
      const { default: api } = await import('../services/api');
      await api.post('/otp/send', { email: pendingEmail, purpose: otpPurpose });
      setResendCooldown(60);
      toast.success('New code sent!');
    } catch {
      toast.error('Failed to resend code');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10" style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-10" style={{ background: 'radial-gradient(circle, #ec4899, transparent)' }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 pulse-glow" style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899, #f97316)' }}>
            <Camera className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-black" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <span className="gradient-text">Social</span><span style={{ color: 'var(--text-primary)' }}>Mini</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Your creative community</p>
        </div>

        <div className="glass-card p-8">
          {/* OTP Screen */}
          {mode === 'otp' ? (
            <div className="fade-in">
              <button onClick={() => switchMode(otpPurpose === 'signup' ? 'signup' : 'login')} className="flex items-center gap-1.5 text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
                  <Mail className="w-7 h-7" style={{ color: '#8b5cf6' }} />
                </div>
                <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Check your email</h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  We sent a 6-digit code to<br />
                  <strong style={{ color: 'var(--text-primary)' }}>{pendingEmail}</strong>
                </p>
              </div>
              <form onSubmit={handleOTPSubmit} className="space-y-6">
                <OTPInput value={otp} onChange={setOtp} disabled={loading} />
                <button id="otp-verify-btn" type="submit" disabled={loading || otp.length < 6} className="btn-brand w-full py-3.5 text-sm flex items-center justify-center gap-2 rounded-xl">
                  {loading ? <><span className="spinner" /> Verifying…</> : 'Verify Code'}
                </button>
              </form>
              <div className="text-center mt-5">
                <button
                  onClick={handleResendOTP}
                  disabled={resendCooldown > 0}
                  className="text-sm flex items-center gap-1.5 mx-auto"
                  style={{ color: resendCooldown > 0 ? 'var(--text-muted)' : '#8b5cf6' }}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
              </div>
            </div>
          ) : (
            <div className="fade-in">
              {/* Tab switcher */}
              <div className="flex rounded-xl p-1 mb-7" style={{ background: 'var(--bg-input)' }}>
                {['login', 'signup'].map(m => (
                  <button
                    key={m}
                    id={`auth-tab-${m}`}
                    onClick={() => switchMode(m)}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
                    style={{
                      background: mode === m ? 'linear-gradient(135deg, #8b5cf6, #ec4899)' : 'transparent',
                      color: mode === m ? 'white' : 'var(--text-muted)',
                      boxShadow: mode === m ? '0 4px 12px rgba(139,92,246,0.3)' : 'none',
                    }}
                  >
                    {m === 'login' ? 'Sign In' : 'Sign Up'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="label">Username</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                      <input id="auth-username" type="text" required autoComplete="username" placeholder="johndoe" className="input-field pl-10" value={username} onChange={e => setUsername(e.target.value)} disabled={loading} />
                    </div>
                  </div>
                )}

                <div>
                  <label className="label">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    <input id="auth-email" type="email" required autoComplete="email" placeholder="you@example.com" className="input-field pl-10" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
                  </div>
                </div>

                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    <input
                      id="auth-password"
                      type={showPass ? 'text' : 'password'}
                      required
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      placeholder={mode === 'login' ? '••••••••' : 'Min. 8 characters'}
                      className="input-field pl-10 pr-10"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      disabled={loading}
                    />
                    <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {mode === 'signup' && (
                    <div className="flex gap-1.5 mt-2">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300" style={{
                          background: password.length >= i * 2 ? (password.length >= 8 ? '#10b981' : '#f59e0b') : 'var(--border-subtle)'
                        }} />
                      ))}
                    </div>
                  )}
                </div>

                <button id="auth-submit-btn" type="submit" disabled={loading} className="btn-brand w-full py-3.5 text-sm flex items-center justify-center gap-2 rounded-xl mt-2">
                  {loading ? (
                    <><span className="spinner" /> {mode === 'login' ? 'Signing in…' : 'Creating account…'}</>
                  ) : (
                    <>{mode === 'login' ? 'Continue' : 'Create Account'} <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>

              <p className="text-center mt-5 text-sm" style={{ color: 'var(--text-muted)' }}>
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')} className="font-semibold" style={{ color: '#8b5cf6' }}>
                  {mode === 'login' ? 'Sign Up free' : 'Sign In'}
                </button>
              </p>
            </div>
          )}
        </div>

        <p className="text-center mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          Protected by JWT 2FA authentication
        </p>
      </div>
    </div>
  );
}
