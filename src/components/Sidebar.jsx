// src/components/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, ClipboardList, History, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Sidebar = () => {
  const { user, logout } = useApp();
  const menuItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Employees', path: '/employees', icon: <Users size={20} /> },
    { name: 'Approval Queue', path: '/approval', icon: <ClipboardList size={20} /> },
    { name: 'History', path: '/history', icon: <History size={20} /> },
  ];

  return (
    <aside className="sidebar glass">
      <div className="sidebar-brand">
        <div className="brand-logo">ELRMS</div>
        <div className="user-info">
          <p className="user-role">{user?.role || 'Admin'}</p>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink 
            key={item.name} 
            to={item.path} 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="nav-link btn-logout" onClick={logout}>
          <LogOut size={20} />
          <span>Logout System</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
