import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import { 
  LayoutDashboard,
  Terminal, 
  Bot,
  Activity, 
  ShieldAlert,
  KeyRound, 
  History, 
  ShieldCheck, 
  BookOpen, 
  Cpu,
  Settings,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenSettings?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen = false, 
  onClose,
  isCollapsed = false,
  onToggleCollapse,
  onOpenSettings
}) => {
  const { user } = useAuth();
  const location = useLocation();
  
  // 10 Core Application Navigation Items
  const navItems = [
    { 
      id: 'overview',
      name: 'Overview', 
      path: '/overview', 
      icon: <LayoutDashboard size={15} />,
      tooltip: 'Overview — Security posture, health status & metrics'
    },
    { 
      id: 'playground',
      name: 'Playground', 
      path: '/playground', 
      icon: <Terminal size={15} />,
      tooltip: 'Playground — Interactive prompt testing & execution trace'
    },
    { 
      id: 'agents',
      name: 'Agents', 
      path: '/agents', 
      icon: <Bot size={15} />,
      tooltip: 'Agents — Agent fleet inventory, posture & kill-switch'
    },
    { 
      id: 'activity',
      name: 'Activity', 
      path: '/activity', 
      icon: <Activity size={15} />,
      tooltip: 'Activity — Chronological security & operational telemetry'
    },
    { 
      id: 'threats',
      name: 'Threats', 
      path: '/threats', 
      icon: <ShieldAlert size={15} />,
      tooltip: 'Threats — Suspicious & blocked incident queue'
    },
    { 
      id: 'honeytokens',
      name: 'Honey Tokens', 
      path: '/honeytokens', 
      icon: <KeyRound size={15} />,
      tooltip: 'Honey Tokens — Canary decoy traps & exfiltration detection'
    },
    { 
      id: 'scanhistory',
      name: 'Scan History', 
      path: '/scan-history', 
      icon: <History size={15} />,
      tooltip: 'Scan History — Searchable audit trail of evaluated prompts'
    },
    { 
      id: 'policies',
      name: 'Policies', 
      path: '/policies', 
      icon: <ShieldCheck size={15} />,
      tooltip: 'Policies — Firewall rules, risk gates & tool authorization'
    },
    { 
      id: 'userguide',
      name: 'User Guide', 
      path: '/user-guide', 
      icon: <BookOpen size={15} />,
      tooltip: 'User Guide — Operations handbook & incident runbooks'
    },
    { 
      id: 'brain',
      name: 'Brain', 
      path: '/brain', 
      icon: <Cpu size={15} />,
      tooltip: 'Brain — Multi-stage defense pipeline architecture'
    },
  ];

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  const isItemActive = (path: string) => {
    if (path === '/overview') {
      return location.pathname === '/' || location.pathname === '/overview' || location.pathname === '/dashboard' || location.pathname === '/home';
    }
    if (path === '/activity') {
      return location.pathname === '/activity' || location.pathname === '/security-activity' || location.pathname === '/events';
    }
    if (path === '/threats') {
      return location.pathname === '/threats' || location.pathname === '/alerts';
    }
    if (path === '/user-guide') {
      return location.pathname === '/user-guide' || location.pathname === '/guide';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <>
      <div 
        className={`sidebar-backdrop ${isOpen ? 'mobile-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside 
        className={`sidebar ${isOpen ? 'mobile-open' : ''} ${isCollapsed ? 'collapsed' : ''}`} 
        aria-label="Main Navigation"
      >
        <div className="sidebar-header">
          <Link to="/" className="sidebar-brand" onClick={handleLinkClick} title="AgentSentry AI Security">
            <div className="logo-badge">
              <ShieldCheck size={18} strokeWidth={2.4} />
            </div>
            {!isCollapsed && (
              <div className="sidebar-title-area">
                <h2>AgentSentry</h2>
                <span>AI SECURITY</span>
              </div>
            )}
          </Link>
          {onClose && (
            <button 
              className="sidebar-close-btn" 
              onClick={onClose}
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
          )}
        </div>
        
        <nav className="sidebar-nav">
          <div className="sidebar-nav-group">
            {!isCollapsed && <span className="sidebar-section-label">Navigation</span>}
            {navItems.map((item) => {
              const active = isItemActive(item.path);

              return (
                <Link 
                  key={item.id} 
                  to={item.path} 
                  className={`nav-item ${active ? 'active' : ''}`}
                  onClick={handleLinkClick}
                  title={isCollapsed ? `${item.name}: ${item.tooltip}` : item.tooltip}
                  aria-label={item.name}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {!isCollapsed && <span className="nav-label">{item.name}</span>}
                </Link>
              );
            })}
          </div>

          <div className="sidebar-nav-group sidebar-nav-secondary">
            {!isCollapsed && <span className="sidebar-section-label">System</span>}
            <button
              type="button"
              className="nav-item w-full text-left bg-transparent border-0 cursor-pointer"
              onClick={onOpenSettings}
              title={isCollapsed ? "Settings: Subsystem & Provider telemetry" : "Settings"}
              aria-label="Settings"
            >
              <span className="nav-icon"><Settings size={15} /></span>
              {!isCollapsed && <span className="nav-label">Settings</span>}
            </button>
            <Link
              to="/user-guide"
              className={`nav-item ${location.pathname === '/user-guide' ? 'active' : ''}`}
              onClick={handleLinkClick}
              title={isCollapsed ? "Help: Operations Guide" : "Help & Documentation"}
              aria-label="Help"
            >
              <span className="nav-icon"><HelpCircle size={15} /></span>
              {!isCollapsed && <span className="nav-label">Help</span>}
            </Link>
          </div>
        </nav>

        <div className="sidebar-footer">
          {/* System Online Status Chip */}
          {!isCollapsed ? (
            <div className="system-status-chip">
              <div className="flex items-center gap-1.5">
                <span className="status-dot-pulse" />
                <span className="status-chip-label">Telemetry Active</span>
              </div>
              <span className="status-chip-badge">ONLINE</span>
            </div>
          ) : (
            <div 
              className="system-status-chip collapsed"
              title="Telemetry Active — Subsystems Online"
            >
              <span className="status-dot-pulse" />
            </div>
          )}

          {/* User profile card */}
          <div className="user-card" title={`Logged in as ${user?.email || 'Security Analyst'}`}>
            <div className="user-avatar" aria-hidden="true">
              {user?.email ? user.email.charAt(0).toUpperCase() : 'S'}
            </div>
            {!isCollapsed && (
              <div className="user-meta">
                <span className="user-email-text">{user?.email || 'security@agentsentry.corp'}</span>
                <span className="user-role-badge">{user?.role || 'operator'}</span>
              </div>
            )}
          </div>

          {/* Bottom Collapse Toggle */}
          {onToggleCollapse && (
            <button 
              className="sidebar-collapse-btn" 
              onClick={onToggleCollapse}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={isCollapsed ? "Expand navigation (Ctrl+\\)" : "Collapse navigation"}
            >
              {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              {!isCollapsed && <span>Collapse</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
