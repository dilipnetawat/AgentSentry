import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { motion } from 'framer-motion';

const AccessDenied: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="auth-container">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="auth-form-wrapper flex flex-col items-center justify-center text-center"
        style={{ borderColor: 'var(--color-critical-border)' }}
      >
        <div className="mb-4 p-3 rounded-full" style={{ background: 'var(--color-critical-bg)', color: 'var(--color-critical)' }}>
          <ShieldAlert size={36} />
        </div>
        <div className="status-badge status-critical mb-3">HTTP 403 · FORBIDDEN</div>
        <h1 className="text-xl font-bold mb-2 text-primary">Access Restricted</h1>
        <p className="mb-6 text-secondary text-xs leading-relaxed">
          Your current session role does not have administrative clearance to access this resource 
          or trigger this privileged security enforcement action.
        </p>
        <div className="flex w-full gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="btn btn-secondary flex-1"
          >
            <ArrowLeft size={14} />
            <span>Go Back</span>
          </button>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="btn btn-primary btn-accent flex-1"
          >
            <LayoutDashboard size={14} />
            <span>Dashboard</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AccessDenied;
