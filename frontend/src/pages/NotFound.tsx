import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, ArrowLeft, LayoutDashboard } from 'lucide-react';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="landing-page-root flex flex-col min-h-screen">
      {/* Public Navbar Minimal */}
      <nav className="public-navbar" aria-label="Main Navigation">
        <div className="landing-container public-nav-inner">
          <Link to="/" className="public-nav-brand" aria-label="AgentSentry Home">
            <div className="logo-badge" aria-hidden="true">
              <ShieldCheck size={20} strokeWidth={2.2} />
            </div>
            <span className="public-brand-title">AgentSentry</span>
          </Link>

          <div className="public-nav-actions">
            {user ? (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn btn-secondary text-xs"
              >
                <LayoutDashboard size={14} />
                <span>Console Dashboard</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="btn btn-secondary text-xs"
              >
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main 404 Content */}
      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="not-found-card text-center max-w-md w-full p-8 border border-[#144272] bg-[#082447] rounded-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-2 bg-gradient-to-r from-transparent via-[#27C4FF] to-transparent"></div>
          <div className="text-7xl font-extrabold tracking-tight text-[#27C4FF] mb-3 font-mono drop-shadow-[0_0_15px_rgba(39,196,255,0.4)]">
            404
          </div>
          <h1 className="text-2xl font-bold text-[#F1F7FF] mb-2">
            Resource Not Found
          </h1>
          <p className="text-sm text-[#9EB9D9] mb-6 leading-relaxed">
            The security console route or telemetry resource you requested is unmapped or has been relocated to another enclave.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn btn-primary"
            >
              <ArrowLeft size={14} />
              <span>Back to Home</span>
            </button>
            {user && (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn btn-secondary"
              >
                <LayoutDashboard size={14} />
                <span>Open Dashboard</span>
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="landing-footer py-6 border-t border-[#144272]">
        <div className="landing-container text-center text-xs text-[#9EB9D9]">
          <span>&copy; {new Date().getFullYear()} AgentSentry. Autonomous AI Agent Security.</span>
        </div>
      </footer>
    </div>
  );
};

export default NotFound;
