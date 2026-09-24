import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Bell, LogOut } from 'lucide-react';
import { fetchRecentAlerts } from '../services/api';

const TopNav: React.FC = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
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
    if (title === 'Honeytokens') title = 'HoneyTokens';
  }

  return (
    <header className="top-nav">
      <div className="top-nav-breadcrumbs">
        <span className="nav-brand-crumb">AgentSentry</span>
        <span className="nav-crumb-separator">/</span>
        <span className="nav-page-crumb">{title}</span>
      </div>

      <div className="top-nav-actions">
        <button 
          className="notification-btn" 
          aria-label={`${activeAlerts} active alerts`} 
          title={activeAlerts > 0 ? `${activeAlerts} open alerts require attention` : "No open alerts"}
          onClick={() => navigate('/alerts')}
        >
          <Bell size={16} />
          {activeAlerts > 0 && <span className="notification-badge-dot">{activeAlerts}</span>}
        </button>

        <div className="status-badge status-default">
          ROLE: {user?.role?.toUpperCase() || 'OPERATOR'}
        </div>

        <button 
          className="btn btn-secondary text-xs" 
          onClick={logout}
          title="Sign out of AgentSentry"
        >
          <LogOut size={13} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
};

export default TopNav;
