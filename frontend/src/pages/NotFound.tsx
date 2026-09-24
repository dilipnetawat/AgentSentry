import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, LayoutDashboard } from 'lucide-react';
import { motion } from 'framer-motion';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="auth-container">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="auth-form-wrapper flex flex-col items-center justify-center text-center"
      >
        <div className="mb-4 p-3 rounded-full" style={{ background: 'var(--bg-surface-elevated)', color: 'var(--color-low)' }}>
          <HelpCircle size={36} />
        </div>
        <div className="status-badge status-default mb-3">HTTP 404 · NOT FOUND</div>
        <h1 className="text-xl font-bold mb-2 text-primary">Resource Not Located</h1>
        <p className="mb-6 text-secondary text-xs leading-relaxed">
          The security console route or agent resource you requested does not exist or has been decommissioned.
        </p>
        <button 
          onClick={() => navigate('/dashboard')} 
          className="btn btn-primary btn-accent w-full"
        >
          <LayoutDashboard size={14} />
          <span>Return to Command Center</span>
        </button>
      </motion.div>
    </div>
  );
};

export default NotFound;
