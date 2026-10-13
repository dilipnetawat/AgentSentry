import React from 'react';

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
    <header className="workspace-page-header">
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
    </header>
  );
};
