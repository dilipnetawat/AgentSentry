import React from 'react';

export type BadgeVariant = 'critical' | 'high' | 'medium' | 'low' | 'safe' | 'default';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ 
  variant = 'default', 
  children, 
  icon,
  className = '',
  ...props 
}) => {
  return (
    <span 
      className={`status-badge status-${variant} ${className}`}
      {...props}
    >
      {icon && <span className="flex items-center justify-center opacity-70">{icon}</span>}
      {children}
    </span>
  );
};
