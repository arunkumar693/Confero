import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sm_user')); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('sm_token'));
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) { setLoading(false); return; }
      try {
        const { data } = await api.get('/auth/me');
        if (data.success) {
          setUser(data.user);
          localStorage.setItem('sm_user', JSON.stringify(data.user));
        } else {
          logout();
        }
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    };
    verifyToken();
  }, []);

  const persistAuth = (userData, tokenData) => {
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem('sm_user', JSON.stringify(userData));
    localStorage.setItem('sm_token', tokenData);
  };

  /**
   * Register a new account. Returns { success, requiresOTP, email, message }
   */
  const register = async (username, email, password) => {
    const { data } = await api.post('/auth/register', { username, email, password });
    return data;
  };

  /**
   * Step 1 of login: validate credentials, triggers OTP email.
   * Returns { success, requiresOTP, email, message }
   */
  const loginStep1 = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  };

  /**
   * Step 2 of login: verify OTP, receive JWT.
   */
  const loginStep2 = async (email, otp) => {
    const { data } = await api.post('/auth/login/verify-otp', { email, otp });
    if (data.success && data.token) {
      persistAuth(data.user, data.token);
    }
    return data;
  };

  /**
   * Legacy direct login (fallback if OTP email fails)
   */
  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.success && data.token) {
      persistAuth(data.user, data.token);
    }
    return data;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('sm_token');
    localStorage.removeItem('sm_user');
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('sm_user', JSON.stringify(updatedUser));
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, register, loginStep1, loginStep2, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
