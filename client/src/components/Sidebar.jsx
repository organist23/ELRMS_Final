import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Clock, History, LogOut } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const Sidebar = ({ onLogout }) => {
  const { confirm } = useNotification();

  const handleLogout = async () => {
    const isConfirmed = await confirm(
      'Confirm Logout',
      'Are you sure you want to logout from the system?'
    );
    if (isConfirmed) onLogout();
  };

  return (
    <aside className="sidebar">
      <div className="logo-section mb-40" style={{ padding: '0 8px' }}>
        <h2 style={{ color: 'var(--primary)', fontWeight: '900', letterSpacing: '-1.5px', fontSize: '1.75rem' }}>ELRMS</h2>
        <p className="text-small text-muted font-bold" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>Management System</p>
      </div>

      <nav style={{ flex: 1 }}>
        <ul style={{ listStyle: 'none' }}>
          <li>
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/employees" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Users size={20} />
              <span>Employees</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/leaves" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Clock size={20} />
              <span>Approval Queue</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/history" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <History size={20} />
              <span>Ledger History</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      <button className="logout-btn" onClick={handleLogout}>
        <LogOut size={20} />
        <span>Logout</span>
      </button>

      <style>{`
        .nav-link {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          text-decoration: none;
          color: var(--secondary);
          font-weight: 500;
          border-radius: var(--radius-sm);
          margin-bottom: 4px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          font-size: 0.9375rem;
        }
        .nav-link:hover {
          background: var(--primary-light);
          color: var(--primary);
        }
        .nav-link.active {
          background: var(--primary);
          color: white;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
        }
        .nav-link svg {
          opacity: 0.7;
        }
        .nav-link.active svg {
          opacity: 1;
        }
        .logout-btn {
          margin-top: auto;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          background: #fff5f5;
          border: 1px solid #fee2e2;
          border-radius: var(--radius-sm);
          color: var(--danger);
          font-weight: 600;
          font-size: 0.9375rem;
          transition: all 0.2s;
        }
        .logout-btn:hover {
          background: #fee2e2;
          transform: translateY(-1px);
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
