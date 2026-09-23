import React, { useState, Suspense, lazy } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../services/api';
import { Triangle } from 'lucide-react';
import { motion } from 'framer-motion';

// Lazy load Spline to prevent blocking the main bundle
const Spline = lazy(() => import('@splinetool/react-spline'));

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return null; // Silent fallback, don't show ugly error text
    }
    return this.props.children;
  }
}

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { checkAuth } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
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
      <div className="spline-container">
        <ErrorBoundary>
          <Suspense fallback={null}>
            <Spline scene="https://prod.spline.design/qV8t2h0w0814C4F0/scene.splinecode" />
          </Suspense>
        </ErrorBoundary>
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="auth-form-wrapper"
      >
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="mb-4 p-3 bg-[var(--surface-50)] rounded-2xl border border-[var(--border-light)] shadow-lg" style={{ backgroundColor: 'var(--surface-50)', borderRadius: '1rem', border: '1px solid var(--border-light)' }}>
            <Triangle size={32} fill="currentColor" strokeWidth={0} className="text-primary" />
          </div>
          <h2 className="text-2xl font-medium m-0 tracking-tight">AgentSentry</h2>
          <p className="text-sm text-tertiary mt-2">Sign in to your security command center</p>
        </div>
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            className="form-error"
          >
            {error}
          </motion.div>
        )}
        
        <button 
          type="button" 
          className="btn btn-secondary w-full mb-4 flex items-center justify-center gap-2"
          disabled={true}
          style={{ opacity: 0.7 }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google — Coming soon
        </button>

        <div className="divider">or continue with email</div>

        <div className="demo-access-note" role="note">
          <strong>Demo Access</strong>
          <span>Demo credentials are provided to judges separately.</span>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4 z-10 relative">
          <div className="form-group">
            <label>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="admin@example.com"
            />
          </div>
          
          <div className="form-group mb-2">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
