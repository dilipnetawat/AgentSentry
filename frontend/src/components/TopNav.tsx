import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Bell, CircleCheck, FlaskConical, LogOut } from 'lucide-react';
import { fetchRecentAlerts } from '../services/api';

const TopNav: React.FC = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [activeAlerts, setActiveAlerts] = React.useState(0);

  React.useEffect(() => {
    fetchRecentAlerts(100, 0)
      .then((alerts) => setActiveAlerts(alerts.filter((alert) => alert.status === 'open').length))
      .catch(() => setActiveAlerts(0));
  }, [location.pathname]);
  
  // Format pathname to a readable title
  const pathParts = location.pathname.split('/').filter(Boolean);
  let title = 'Dashboard';
  if (pathParts.length > 0) {
    title = pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1);
    if (title === 'Events') title = 'Security Events';
  }

  return (
    <header className="top-nav">
      <div className="top-nav-status">
        <span className="top-nav-brand">AgentSentry</span><span className="top-nav-divider">/</span><span className="top-nav-page">{title}</span>
        <span className="system-status"><CircleCheck size={14} /> System Online</span>
        <span className="demo-status"><FlaskConical size={14} /> Demo Mode</span>
      </div>
      <div className="nav-actions flex items-center gap-4">
        <button className="icon-button notification-button" aria-label={`${activeAlerts} active alerts`} title="Active alerts">
          <Bell size={17} />
          {activeAlerts > 0 && <span className="notification-count">{activeAlerts}</span>}
        </button>
        <div className="top-nav-user"><span className="user-avatar small">{user?.email?.charAt(0).toUpperCase()}</span><span><strong>{user?.role}</strong><small>{user?.email}</small></span></div>
        <button className="btn btn-secondary text-xs" onClick={logout}>
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
};

export default TopNav;
