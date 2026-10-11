import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Shield, 
  AlertTriangle, 
  List, 
  Database,
  ShieldCheck,
  FlaskConical,
  Terminal
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  
  const navGroups = [
    { 
      label: 'Overview', 
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={17} /> }
      ] 
    },
    { 
      label: 'Security & Controls', 
      items: [
        { name: 'Agents', path: '/agents', icon: <Shield size={17} /> },
        { name: 'Security Events', path: '/events', icon: <List size={17} /> },
        { name: 'Alerts', path: '/alerts', icon: <AlertTriangle size={17} /> },
        { name: 'HoneyTokens', path: '/honeytokens', icon: <Database size={17} /> },
      ] 
    },
    { 
      label: 'Operations & Sandbox', 
      items: [
        { name: 'Secure AI Playground', path: '/playground', icon: <Terminal size={17} /> },
        { name: 'Guided Demo', path: '/dashboard#guided-demo', icon: <FlaskConical size={17} /> }
      ] 
    },
  ];

  return (
    <aside className="sidebar" aria-label="Main Navigation">
      <div className="sidebar-header">
        <div className="logo-badge">
          <ShieldCheck size={20} strokeWidth={2.2} />
        </div>
        <div className="sidebar-title-area">
          <h2>AgentSentry</h2>
          <span>AI Agent Defense Console</span>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        {navGroups.map((group) => (
          <div className="sidebar-nav-group" key={group.label}>
            <span className="sidebar-section-label">{group.label}</span>
            {group.items.map((item) => {
              const isActive = item.name === 'Guided Demo'
                ? location.pathname === '/dashboard' && location.hash === '#guided-demo'
                : location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
              return (
                <Link 
                  key={item.path} 
                  to={item.path} 
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      
      <div className="sidebar-footer">
        <div className="user-card" title={user?.email || 'User Session'}>
          <div className="user-avatar">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="user-meta">
            <span className="user-email-text">{user?.email || 'Active Operator'}</span>
            <span className="user-role-badge">{user?.role || 'analyst'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
