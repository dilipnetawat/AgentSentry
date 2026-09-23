import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

const AccessDenied: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="auth-container">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="auth-form-wrapper flex flex-col items-center justify-center text-center max-w-md p-10"
        style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}
      >
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-[var(--bg-critical)] rounded-full text-critical">
            <ShieldAlert size={48} />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-4 text-critical">Access Denied</h1>
        <p className="mb-8 text-secondary">
          You do not have the required permissions to access this resource or perform this action. Please contact your system administrator if you believe this is an error.
        </p>
        <div className="flex w-full gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="btn btn-secondary flex-1"
          >
            Go Back
          </button>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="btn btn-primary flex-1"
          >
            Dashboard
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AccessDenied;
