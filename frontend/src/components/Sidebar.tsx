import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Shield, 
  AlertTriangle, 
  List, 
  Database,
  Triangle,
  FlaskConical
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  
  const navGroups = [
    { label: 'Overview', items: [{ name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> }] },
    { label: 'Security', items: [
      { name: 'Agents', path: '/agents', icon: <Shield size={18} /> },
      { name: 'Security Events', path: '/events', icon: <List size={18} /> },
      { name: 'Alerts', path: '/alerts', icon: <AlertTriangle size={18} /> },
      { name: 'HoneyTokens', path: '/honeytokens', icon: <Database size={18} /> },
    ] },
    { label: 'Operations', items: [{ name: 'Guided Demo', path: '/dashboard#guided-demo', icon: <FlaskConical size={18} /> }] },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo-icon">
          <Triangle size={24} fill="currentColor" strokeWidth={0} className="text-primary" />
        </div>
        <div><h2>AgentSentry</h2><span>Secure AI Agents. Safe Operations.</span></div>
      </div>
      
      <nav className="sidebar-nav">
        {navGroups.map((group) => <div className="sidebar-nav-group" key={group.label}>
          <span className="sidebar-section-label">{group.label}</span>
          {group.items.map((item) => {
            const isActive = item.name === 'Guided Demo'
              ? location.pathname === '/dashboard'
              : location.pathname.startsWith(item.path);
            return (
              <Link key={item.path} to={item.path} className={`nav-item ${isActive ? 'active' : ''}`}>
                <span className={`flex items-center justify-center opacity-80 ${isActive ? 'text-primary opacity-100' : ''}`}>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>)}
      </nav>
      
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{user?.email?.charAt(0).toUpperCase()}</div>
          <div className="user-details">
            <div className="user-email">{user?.email}</div>
            <div className={`user-role role-${user?.role}`}>{user?.role}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
