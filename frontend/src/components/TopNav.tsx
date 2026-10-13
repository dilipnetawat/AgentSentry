import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUIPreferences } from '../contexts/UIPreferencesContext';
import { Bell, LogOut, Menu, Shield, Globe, Sun, Moon } from 'lucide-react';
import { fetchRecentAlerts } from '../services/api';

interface TopNavProps {
  onToggleMobileNav?: () => void;
}

const TopNav: React.FC<TopNavProps> = ({ onToggleMobileNav }) => {
  const { logout, user } = useAuth();
  const { language, setLanguage, textSize, increaseTextSize, decreaseTextSize, theme, toggleTheme, t } = useUIPreferences();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeAlerts, setActiveAlerts] = React.useState(0);

  React.useEffect(() => {
    fetchRecentAlerts(50, 0)
      .then((alerts) => setActiveAlerts(alerts.filter((alert) => alert.status === 'open').length))
      .catch(() => setActiveAlerts(0));
  }, [location.pathname]);
  
  // Format pathname to a readable page title
  const pathParts = location.pathname.split('/').filter(Boolean);
  let title = 'Overview';
  if (pathParts.length > 0) {
    const raw = pathParts[0].toLowerCase();
    if (raw === 'overview' || raw === 'dashboard' || raw === 'home') title = 'Overview';
    else if (raw === 'playground') title = 'Playground';
    else if (raw === 'agents') title = 'Agents';
    else if (raw === 'activity' || raw === 'security-activity' || raw === 'events') title = 'Activity';
    else if (raw === 'threats' || raw === 'alerts') title = 'Threats';
    else if (raw === 'honeytokens') title = 'Honey Tokens';
    else if (raw === 'scan-history') title = 'Scan History';
    else if (raw === 'policies') title = 'Policies';
    else if (raw === 'brain' || raw === 'architecture') title = 'Brain';
    else if (raw === 'how-it-works') title = 'How It Works';
    else if (raw === 'user-guide' || raw === 'guide') title = 'User Guide';
    else title = raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  return (
    <header className="top-nav" aria-label="Top Navigation Bar">
      <div className="top-nav-left">
        {onToggleMobileNav && (
          <button 
            className="mobile-menu-toggle" 
            onClick={onToggleMobileNav}
            aria-label="Toggle navigation menu"
          >
            <Menu size={18} />
          </button>
        )}
        <div className="top-nav-breadcrumbs">
          <span className="nav-brand-crumb flex items-center gap-1.5 font-semibold text-accent-cyan">
            <Shield size={15} className="text-accent-cyan" />
            <span>AgentSentry</span>
          </span>
          <span className="nav-crumb-separator">/</span>
          <span className="nav-page-crumb">{title}</span>
        </div>
      </div>

      <div className="top-nav-actions">
        {/* Language Selector: EN / हिंदी */}
        <div className="flex items-center gap-1 p-0.5 rounded border border-border bg-surface text-xs" title="Select UI Language / भाषा चुनें">
          <Globe size={13} className="text-secondary ml-1" />
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-1.5 py-0.5 rounded text-xs transition-colors ${language === 'en' ? 'bg-primary text-white font-semibold' : 'text-secondary hover:text-white'}`}
            style={{ border: 'none', cursor: 'pointer', background: language === 'en' ? 'var(--primary)' : 'transparent' }}
          >
            EN
          </button>
          <span className="text-border">|</span>
          <button
            type="button"
            onClick={() => setLanguage('hi')}
            className={`px-1.5 py-0.5 rounded text-xs transition-colors ${language === 'hi' ? 'bg-primary text-white font-semibold' : 'text-secondary hover:text-white'}`}
            style={{ border: 'none', cursor: 'pointer', background: language === 'hi' ? 'var(--primary)' : 'transparent' }}
          >
            हिंदी
          </button>
        </div>

        {/* Text-size Controls: A- / A+ */}
        <div className="flex items-center gap-0.5 p-0.5 rounded border border-border bg-surface text-xs" title="Text size scaling (100% / 115% / 130%) / फ़ॉन्ट आकार">
          <button
            type="button"
            onClick={decreaseTextSize}
            disabled={textSize === 'small'}
            className="px-1.5 py-0.5 rounded text-xs text-secondary hover:text-white disabled:opacity-40"
            style={{ border: 'none', background: 'transparent', cursor: textSize === 'small' ? 'not-allowed' : 'pointer' }}
            title="Decrease font size (A-)"
            aria-label="Decrease text size"
          >
            A−
          </button>
          <span className="text-xs font-mono text-tertiary px-0.5">
            {textSize === 'small' ? '100%' : textSize === 'normal' ? '115%' : '130%'}
          </span>
          <button
            type="button"
            onClick={increaseTextSize}
            disabled={textSize === 'large'}
            className="px-1.5 py-0.5 rounded text-xs text-secondary hover:text-white disabled:opacity-40"
            style={{ border: 'none', background: 'transparent', cursor: textSize === 'large' ? 'not-allowed' : 'pointer' }}
            title="Increase font size (A+)"
            aria-label="Increase text size"
          >
            A+
          </button>
        </div>

        {/* Light / Dark Mode Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-1.5 rounded border border-border bg-surface text-secondary hover:text-white transition-colors flex items-center justify-center cursor-pointer"
          style={{ width: '30px', height: '30px' }}
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <Sun size={15} className="text-amber-400" />
          ) : (
            <Moon size={15} className="text-accent-cyan" />
          )}
        </button>

        {/* Active Alerts Bell */}
        <button 
          className="notification-btn" 
          aria-label={`${activeAlerts} active alerts`} 
          title={activeAlerts > 0 ? `${activeAlerts} open alerts require triage` : "No open alerts"}
          onClick={() => navigate('/threats')}
        >
          <Bell size={15} />
          {activeAlerts > 0 && <span className="notification-badge-dot">{activeAlerts}</span>}
        </button>

        {/* User Role Badge */}
        <div className="status-badge status-default" title={`Active role: ${user?.role || 'operator'}`}>
          {user?.role?.toUpperCase() || 'OPERATOR'}
        </div>

        {/* Sign Out Action */}
        <button 
          className="btn btn-secondary text-xs" 
          onClick={logout}
          title="Sign out of AgentSentry"
        >
          <LogOut size={13} />
          <span>{t('topbar.signout')}</span>
        </button>
      </div>
    </header>
  );
};

export default TopNav;
