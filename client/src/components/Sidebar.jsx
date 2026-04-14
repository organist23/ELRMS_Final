import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Clock, History, LogOut } from 'lucide-react';

const Sidebar = ({ onLogout }) => {
  return (
    <aside className="sidebar">
      <div className="logo-section mb-32" style={{ padding: '0 16px', marginBottom: '40px' }}>
        <h2 style={{ color: 'var(--primary)', fontWeight: '800', letterSpacing: '-1px' }}>ELRMS v2</h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Admin Management</p>
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

      <button className="logout-btn" onClick={onLogout} style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'none', border: 'none', color: 'var(--danger)', fontWeight: '600' }}>
        <LogOut size={20} />
        <span>Logout</span>
      </button>

      <style>{`
        .nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          text-decoration: none;
          color: var(--text-muted);
          font-weight: 500;
          border-radius: 8px;
          margin-bottom: 4px;
          transition: all 0.2s ease;
        }
        .nav-link:hover {
          background: var(--primary-light);
          color: var(--primary);
        }
        .nav-link.active {
          background: var(--primary);
          color: white;
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
