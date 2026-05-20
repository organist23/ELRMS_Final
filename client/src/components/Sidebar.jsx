import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Clock, History, LogOut, ClipboardList, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const Sidebar = ({ onLogout }) => {
  const { confirm } = useNotification();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    const isConfirmed = await confirm(
      'Confirm Logout',
      'Are you sure you want to logout from the system?'
    );
    if (isConfirmed) onLogout();
  };

  const navItems = [
    { to: "/", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { to: "/employees", icon: <Users size={20} />, label: "Employees" },
    { to: "/leaves", icon: <Clock size={20} />, label: "Approval Queue" },
    { to: "/history", icon: <History size={20} />, label: "Ledger History" },
    { to: "/ledger-summary", icon: <ClipboardList size={20} />, label: "Ledger Summary" },
    { to: "/settings", icon: <Settings size={20} />, label: "Settings" },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Toggle Button - Now more integrated */}
      <button 
        className="collapse-toggle" 
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? "Expand Sidebar" : "Minimize Sidebar"}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="logo-section mb-40" style={{ padding: '0 4px', textAlign: 'center' }}>
        <h2 style={{ 
          color: 'var(--primary)', 
          fontWeight: '900', 
          letterSpacing: isCollapsed ? '-0.5px' : '-1.5px', 
          fontSize: isCollapsed ? '1rem' : '1.75rem',
          transition: 'all 0.3s ease'
        }}>
          ELRMS
        </h2>
        {!isCollapsed && (
          <p className="text-small text-muted font-bold fade-in" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Management System
          </p>
        )}
      </div>

      <nav style={{ flex: 1 }}>
        <ul style={{ listStyle: 'none' }}>
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink 
                to={item.to} 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                title={isCollapsed ? item.label : ""}
                style={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}
              >
                {item.icon}
                {!isCollapsed && <span className="fade-in">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <button 
        className="logout-btn" 
        onClick={handleLogout}
        title={isCollapsed ? "Logout" : ""}
        style={{ 
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          padding: isCollapsed ? '14px 0' : '14px 16px'
        }}
      >
        <LogOut size={20} />
        {!isCollapsed && <span className="fade-in">Logout</span>}
      </button>

      <style>{`
        /* =============================================
           COLLAPSE TOGGLE BUTTON
        ============================================= */
        .collapse-toggle {
          position: absolute;
          top: 18px;
          right: -13px;
          width: 26px;
          height: 26px;
          background: white;
          border: 2px solid var(--border);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
          z-index: 10;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.12);
          cursor: pointer;
        }
        .collapsed .collapse-toggle {
          right: -13px;
          top: 18px;
          transform: none;
        }
        .collapse-toggle:hover {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.25);
          transform: scale(1.1);
        }

        /* =============================================
           NAV LINKS — EXPANDED STATE
        ============================================= */
        .nav-link {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 11px 14px;
          text-decoration: none;
          color: var(--secondary);
          font-weight: 500;
          border-radius: var(--radius-sm);
          margin-bottom: 3px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          font-size: 0.9375rem;
          white-space: nowrap;
          flex-shrink: 0;
          position: relative;
          overflow: hidden;
        }
        .nav-link:hover {
          background: var(--primary-light);
          color: var(--primary);
          transform: translateX(2px);
        }
        .nav-link.active {
          background: var(--primary);
          color: white;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.2);
          font-weight: 600;
        }
        .nav-link svg {
          opacity: 0.65;
          flex-shrink: 0;
          transition: opacity 0.2s, transform 0.2s;
        }
        .nav-link:hover svg {
          opacity: 1;
          transform: scale(1.1);
        }
        .nav-link.active svg {
          opacity: 1;
        }

        /* =============================================
           NAV LINKS — COLLAPSED STATE
           Icons become centered pill buttons with
           a glowing ring on active and tooltip on hover
        ============================================= */
        .sidebar.collapsed .nav-link {
          justify-content: center;
          padding: 12px 0;
          margin-bottom: 6px;
          border-radius: 12px;
          width: 46px;
          margin-left: auto;
          margin-right: auto;
        }
        .sidebar.collapsed .nav-link:hover {
          background: var(--primary-light);
          color: var(--primary);
          transform: scale(1.08);
        }
        .sidebar.collapsed .nav-link.active {
          background: var(--primary);
          color: white;
          box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.12), 0 4px 14px rgba(15, 23, 42, 0.2);
          width: 46px;
          border-radius: 14px;
        }
        .sidebar.collapsed .nav-link svg {
          opacity: 1;
        }

        /* =============================================
           LOGOUT BUTTON — EXPANDED STATE
        ============================================= */
        .logout-btn {
          margin-top: auto;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 16px;
          background: linear-gradient(135deg, #fff5f5, #fff0f0);
          border: 1.5px solid #fecaca;
          border-radius: 12px;
          color: var(--danger);
          font-weight: 700;
          font-size: 0.9rem;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
          flex-shrink: 0;
          width: 100%;
          letter-spacing: 0.01em;
        }
        .logout-btn svg {
          transition: transform 0.25s ease;
          flex-shrink: 0;
        }
        .logout-btn:hover {
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          border-color: #f87171;
          color: #b91c1c;
          box-shadow: 0 4px 14px rgba(239, 68, 68, 0.2);
          transform: translateY(-2px);
        }
        .logout-btn:hover svg {
          transform: translateX(3px) rotate(-5deg);
        }
        .logout-btn:active {
          transform: translateY(0);
        }

        /* =============================================
           LOGOUT BUTTON — COLLAPSED STATE
        ============================================= */
        .sidebar.collapsed .logout-btn {
          width: 46px;
          padding: 13px 0;
          justify-content: center;
          border-radius: 12px;
          margin-left: auto;
          margin-right: auto;
          gap: 0;
        }
        .sidebar.collapsed .logout-btn:hover {
          transform: scale(1.08);
        }

        /* =============================================
           LOGO SECTION — COLLAPSED STATE
        ============================================= */
        .sidebar.collapsed .logo-section {
          text-align: center;
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
