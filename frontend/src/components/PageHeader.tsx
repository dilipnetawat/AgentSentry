import React from 'react';
import { motion } from 'framer-motion';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  description, 
  icon,
  actions 
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="workspace-page-header"
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className="page-header-icon">
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-2xl font-medium m-0 flex items-center gap-2">{title}</h2>
          {description && <p className="text-sm text-tertiary m-0 mt-1">{description}</p>}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </motion.div>
  );
};
