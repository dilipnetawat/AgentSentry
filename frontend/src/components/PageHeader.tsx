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
    <motion.header 
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="workspace-page-header"
    >
      <div className="page-header-info">
        {icon && (
          <div className="page-header-icon-box">
            {icon}
          </div>
        )}
        <div className="page-header-title-text">
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
      </div>
      {actions && (
        <div className="page-header-actions">
          {actions}
        </div>
      )}
    </motion.header>
  );
};
