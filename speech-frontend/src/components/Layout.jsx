import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useState } from 'react';
import './Layout.css';

const NAV = [
  { to: '/dashboard',    icon: '🏠', label: 'Dashboard' },
  { to: '/practice',     icon: '🎙️', label: 'Practice' },
  { to: '/progress',     icon: '📈', label: 'Progress' },
  { to: '/history',      icon: '📋', label: 'History' },
  { to: '/feedback',     icon: '💬', label: 'Feedback' },
  { to: '/achievements', icon: '🏆', label: 'Achievements' },
  { to: '/chatbot',      icon: '🤖', label: 'AI Chatbot' },
  { to: '/profile',      icon: '👤', label: 'Profile' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className={`layout ${collapsed ? 'collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🗣️</span>
            {!collapsed && <span className="logo-text">SpeechCare</span>}
          </div>
          <button className="collapse-btn" onClick={() => setCollapsed(c => !c)}>
            {collapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">{n.icon}</span>
              {!collapsed && <span className="nav-label">{n.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="avatar">{user?.full_name?.[0]?.toUpperCase() || 'U'}</div>
            {!collapsed && (
              <div className="user-details">
                <div className="user-name">{user?.full_name}</div>
                <div className="user-username">@{user?.username}</div>
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <span>🚪</span>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
