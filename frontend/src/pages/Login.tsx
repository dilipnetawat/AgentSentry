import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch, registerUser } from '../services/api';
import { ShieldCheck, Lock, UserPlus, Info, ArrowLeft } from 'lucide-react';

const Login: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSsoNotice, setShowSsoNotice] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, checkAuth } = useAuth();

  React.useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location.state]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (mode === 'register') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters long');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      setIsSubmitting(true);
      try {
        await registerUser(email, password);
        setSuccessMsg('Account registered successfully! Signing you in...');

        // Auto-login newly registered user
        await apiFetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        await checkAuth();
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } catch (err: any) {
        setError(err.message || 'Registration failed');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Login mode
    setIsSubmitting(true);
    try {
      await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      // Refresh auth context
      await checkAuth();
      
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form-wrapper">
        <div className="mb-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors cursor-pointer"
            style={{ background: 'none', border: 'none', padding: 0 }}
          >
            <ArrowLeft size={13} />
            <span>Back to AgentSentry</span>
          </button>
        </div>

        <div className="auth-header">
          <div className="logo-badge mx-auto mb-2" style={{ margin: '0 auto 0.75rem', width: '40px', height: '40px' }}>
            <ShieldCheck size={22} strokeWidth={2.2} />
          </div>
          <h1 className="m-0 text-xl font-bold text-primary">AgentSentry</h1>
          <p className="text-xs text-tertiary mt-1 m-0">Enterprise AI Security &amp; Defense Platform</p>
        </div>

        {/* Tab switch between Sign In and Register */}
        <div className="tab-group mb-4" style={{ width: '100%', display: 'flex' }}>
          <button
            type="button"
            className={`tab-btn ${mode === 'login' ? 'active' : ''}`}
            style={{ flex: 1, textAlign: 'center', padding: '0.45rem' }}
            onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
          >
            Operator Sign In
          </button>
          <button
            type="button"
            className={`tab-btn ${mode === 'register' ? 'active' : ''}`}
            style={{ flex: 1, textAlign: 'center', padding: '0.45rem' }}
            onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
          >
            Create Account
          </button>
        </div>
        
        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        {successMsg && (
          <div 
            className="p-2.5 rounded text-xs mb-3"
            style={{ background: 'var(--color-safe-bg)', border: '1px solid var(--color-safe-border)', color: 'var(--color-safe)' }}
          >
            {successMsg}
          </div>
        )}

        <button
          type="button"
          className="btn btn-secondary w-full mb-3 flex items-center justify-center gap-2"
          onClick={() => setShowSsoNotice(!showSsoNotice)}
          title="Google Single Sign-On"
          style={{ padding: '0.55rem' }}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>Continue with Google SSO</span>
        </button>

        {showSsoNotice && (
          <div className="flex items-start gap-2 p-2.5 rounded bg-surface border border-light text-xs text-secondary mb-3">
            <Info size={14} className="text-accent flex-shrink-0 mt-0.5" />
            <span>
              Google SSO token validation is supported via Firebase OAuth when <code>FIREBASE_PROJECT_ID</code> is configured. Use standard credentials below for direct access.
            </span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0', color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          <span style={{ padding: '0 0.5rem' }}>or authenticate with credentials</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
        </div>

        <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3">
          <div className="form-group">
            <label htmlFor="auth-email">Operator Email Address</label>
            <input 
              id="auth-email"
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="admin@agentsentry.local"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="auth-password">{mode === 'register' ? 'Choose Password (min 8 characters)' : 'Password'}</label>
            <input 
              id="auth-password"
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              placeholder="••••••••••••"
            />
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="auth-confirm-password">Confirm Password</label>
              <input
                id="auth-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••••••"
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-accent w-full mt-2"
            disabled={isSubmitting}
            style={{ padding: '0.65rem' }}
          >
            {mode === 'register' ? <UserPlus size={14} /> : <Lock size={14} />}
            <span>
              {isSubmitting
                ? (mode === 'register' ? 'Registering Account...' : 'Authenticating...')
                : (mode === 'register' ? 'Register Operator Account' : 'Sign In to Console')}
            </span>
          </button>
        </form>

        <div 
          style={{ 
            marginTop: '1.25rem', 
            padding: '0.75rem', 
            borderRadius: 'var(--radius-sm)', 
            background: 'var(--bg-surface)', 
            border: '1px solid var(--border-subtle)', 
            fontSize: '0.72rem',
            color: 'var(--text-tertiary)'
          }}
        >
          <strong className="text-secondary block mb-1">Default Local Credentials:</strong>
          <span><code>admin@agentsentry.local</code> / <code>adminpassword</code></span>
        </div>
      </div>
    </div>
  );
};

export default Login;
