import React from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, HelpCircle } from 'lucide-react';

export type BadgeVariant = 'critical' | 'high' | 'medium' | 'low' | 'safe' | 'default' | 'neutral';

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
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: '4px' }}>{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

export const DecisionBadge: React.FC<{ 
  decision?: string | null; 
  className?: string; 
  showIcon?: boolean 
}> = ({ 
  decision, 
  className = '', 
  showIcon = false 
}) => {
  const norm = (decision || 'UNKNOWN').trim().toUpperCase();
  
  let decisionClass = 'decision-neutral';
  let IconComponent = HelpCircle;

  if (norm.includes('BLOCK') || norm.includes('DENY') || norm.includes('REJECT') || norm.includes('ISOLAT')) {
    decisionClass = 'decision-block';
    IconComponent = ShieldAlert;
  } else if (norm.includes('QUARANTINE') || norm.includes('WARN') || norm.includes('SANITIZE') || norm.includes('SUSPICIOUS')) {
    decisionClass = 'decision-quarantine';
    IconComponent = AlertTriangle;
  } else if (norm.includes('ALLOW') || norm.includes('PASS') || norm.includes('CLEAN')) {
    decisionClass = 'decision-allow';
    IconComponent = ShieldCheck;
  } else {
    decisionClass = 'decision-neutral';
    IconComponent = HelpCircle;
  }

  return (
    <span className={`decision-badge ${decisionClass} ${className}`}>
      {showIcon && <IconComponent size={12} className="shrink-0" />}
      <span>{norm}</span>
    </span>
  );
};
