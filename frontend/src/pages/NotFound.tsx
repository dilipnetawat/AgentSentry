import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="auth-container">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="auth-form-wrapper flex flex-col items-center justify-center text-center max-w-md p-10"
      >
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-[var(--surface-50)] rounded-full text-secondary">
            <HelpCircle size={48} />
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-2">404</h1>
        <h2 className="text-xl font-medium mb-4 text-primary">Page Not Found</h2>
        <p className="mb-8 text-secondary">
          The page you are looking for does not exist or has been moved.
        </p>
        <button 
          onClick={() => navigate('/dashboard')} 
          className="btn btn-primary w-full"
        >
          Return to Dashboard
        </button>
      </motion.div>
    </div>
  );
};

export default NotFound;
