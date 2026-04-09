// src/components/Dashboard.jsx
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Users, Clock, ShieldCheck, Activity, Zap } from 'lucide-react';
import { formatCredits } from '../utils/leaveLogic';
import GenerateCreditsModal from './GenerateCreditsModal';

const Dashboard = () => {
  const { employees, applications, ledger } = useApp();
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);

  const stats = [
    { label: 'Total Employees', value: employees.length, icon: <Users />, color: 'var(--primary)' },
    { label: 'Pending Approval', value: applications.filter(a => a.status === 'Pending Approval').length, icon: <Clock />, color: 'var(--warning)' },
    { label: 'Active Records', value: employees.filter(e => e.isActive).length, icon: <ShieldCheck />, color: 'var(--success)' },
  ];

  return (
    <div className="dashboard-page">
      <header className="page-header flex-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p className="text-muted">Welcome back, Admin. Here is what's happening today.</p>
        </div>
        <button 
          className="btn-primary flex-btn"
          onClick={() => setIsGenModalOpen(true)}
        >
          <Zap size={20} />
          <span>Generate Credits</span>
        </button>
      </header>

      <div className="dashboard-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="premium-card stat-card">
            <div className="stat-icon" style={{ background: `${stat.color}20`, color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-info">
              <h3>{stat.label}</h3>
              <p className="value">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="premium-card ledger-section">
        <div className="section-header">
          <div className="title-with-icon">
            <Activity size={20} className="icon-success" />
            <h2>Recent Ledger Activity</h2>
          </div>
        </div>
        
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Employee</th>
              <th>Transaction</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {ledger.slice(0, 10).map((entry) => (
              <tr key={entry.id}>
                <td>{new Date(entry.date).toLocaleDateString()}</td>
                <td>
                  <div className="actor-display">
                    <p className="font-bold">{entry.employeeName}</p>
                    <p className="text-muted small">{entry.employeeId}</p>
                  </div>
                </td>
                <td className="transaction-text">
                  {entry.transaction}
                  {entry.balancesAfter && (
                    <div className="balance-snapshot-mini">
                      <span>VL: {formatCredits(entry.balancesAfter.vacationLeave)}</span>
                      <span>SL: {formatCredits(entry.balancesAfter.sickLeave)}</span>
                    </div>
                  )}
                </td>
                <td>
                  <span className={`badge badge-${entry.status.toLowerCase().replace(' ', '-')}`}>
                    {entry.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isGenModalOpen && (
        <GenerateCreditsModal 
          onClose={() => setIsGenModalOpen(false)} 
        />
      )}
    </div>
  );
};

export default Dashboard;
