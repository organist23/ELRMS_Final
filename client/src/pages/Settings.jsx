import React, { useState, useEffect } from 'react';
import { Database, Monitor, Download, Loader2, CheckCircle2, AlertTriangle, Server } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('database');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);
  const { notify } = useNotification();

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/ping');
      const data = await res.json();
      setSystemStatus(data);
    } catch (err) {
      setSystemStatus({ success: false, message: 'Server unreachable' });
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const response = await fetch('http://localhost:5000/api/system/backup');

      if (!response.ok) {
        throw new Error('Backup failed on server');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `elrms_backup_${new Date().toISOString().split('T')[0]}.sql`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      notify('Success', 'Database backup downloaded successfully.', 'success');
    } catch (error) {
      console.error('Backup Error:', error);
      notify('Error', error.message || 'Failed to generate backup.', 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Monitor },
    { id: 'database', label: 'Database', icon: Database },
  ];

  return (
    <div className="settings-container">
      <div className="settings-card">
        <aside className="settings-sidebar">
          <div className="sidebar-header">
            <h3>Settings</h3>
            <p>System Configuration</p>
          </div>
          <nav className="settings-nav">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`settings-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="settings-content">
          {activeTab === 'general' && (
            <div className="settings-section animate-fade-in">
              <header className="section-header">
                <h2>General Settings</h2>
                <p>Manage basic system information and view status.</p>
              </header>

              <div className="info-grid">
                <div className="info-card">
                  <div className="info-icon">
                    <Server size={24} />
                  </div>
                  <div className="info-body">
                    <h4>Server Status</h4>
                    <div className="status-indicator">
                      {systemStatus?.success ? (
                        <span className="status-badge online">
                          <CheckCircle2 size={14} /> Online
                        </span>
                      ) : (
                        <span className="status-badge offline">
                          <AlertTriangle size={14} /> {systemStatus?.message || 'Connecting...'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-icon">
                    <Monitor size={24} />
                  </div>
                  <div className="info-body">
                    <h4>Version Info</h4>
                    <p className="version-text">ELRMS v2.1.0-stable</p>
                    <p className="text-muted text-small">Latest stable build</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="settings-section animate-fade-in">
              <header className="section-header">
                <h2>Database Management</h2>
                <p>System maintenance and data portability tools.</p>
              </header>

              <div className="settings-group">
                <h4 className="group-title">Data Backup</h4>
                <div className="action-row">
                  <div className="action-info">
                    <div className="action-icon-wrapper">
                      <Database size={20} />
                    </div>
                    <div className="action-text">
                      <h5>Full SQL Snapshot</h5>
                      <p>Download a complete backup of all database tables including employees and ledger history.</p>
                    </div>
                  </div>
                  <button
                    className="btn-minimal"
                    onClick={handleBackup}
                    disabled={isBackingUp}
                  >
                    {isBackingUp ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        <span>Backup Database</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="subtle-note">
                  <AlertTriangle size={15} />
                  <span>NOTE: Before yearly rollover, backups are recommended to prevent data loss during system transitions.</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <style>{`
        .settings-container {
          padding: 24px;
          height: calc(100vh - 100px);
          max-width: 1200px;
          margin: 0 auto;
        }

        .settings-card {
          background: white;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-md);
          display: grid;
          grid-template-columns: 280px 1fr;
          height: 100%;
          overflow: hidden;
          border: 1px solid var(--border-color);
        }

        .settings-sidebar {
          background: #f8fafc;
          border-right: 1px solid var(--border-color);
          padding: 32px 16px;
        }

        .sidebar-header {
          padding: 0 16px 24px;
          border-bottom: 1px solid rgba(0,0,0,0.05);
          margin-bottom: 24px;
        }

        .sidebar-header h3 {
          margin: 0;
          color: var(--secondary);
          font-weight: 700;
        }

        .sidebar-header p {
          margin: 4px 0 0;
          font-size: 0.8125rem;
          color: var(--muted);
        }

        .settings-nav {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .settings-tab-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: transparent;
          border: none;
          border-radius: var(--radius-md);
          color: var(--secondary);
          font-weight: 500;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
        }

        .settings-tab-btn:hover {
          background: rgba(0,0,0,0.03);
          color: var(--primary);
        }

        .settings-tab-btn.active {
          background: var(--primary);
          color: white;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
        }

        .settings-content {
          padding: 40px;
          overflow-y: auto;
        }

        .section-header {
          margin-bottom: 32px;
        }

        .section-header h2 {
          margin: 0;
          font-size: 1.75rem;
          color: var(--secondary);
          font-weight: 800;
        }

        .section-header p {
          margin: 8px 0 0;
          color: var(--muted);
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
        }

        .info-card {
          padding: 24px;
          background: white;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          display: flex;
          gap: 20px;
          align-items: center;
        }

        .info-icon {
          width: 54px;
          height: 54px;
          border-radius: var(--radius-md);
          background: var(--primary-light);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .info-body h4 {
          margin: 0 0 8px;
          color: var(--secondary);
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.8125rem;
          font-weight: 600;
        }

        .status-badge.online {
          background: #ecfdf5;
          color: var(--success);
        }

        .status-badge.offline {
          background: #fef2f2;
          color: var(--danger);
        }

        /* --- Minimalist Action Row Styles --- */
        .settings-group {
          background: white;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 24px;
        }

        .group-title {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--muted);
          margin: 0 0 16px;
          font-weight: 700;
        }

        .action-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
          padding: 16px;
          background: #fcfcfd;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
        }

        .action-info {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .action-icon-wrapper {
          width: 40px;
          height: 40px;
          background: white;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--secondary);
          flex-shrink: 0;
        }

        .action-text h5 {
          margin: 0;
          font-size: 0.9375rem;
          color: var(--secondary);
          font-weight: 600;
        }

        .action-text p {
          margin: 4px 0 0;
          font-size: 0.8125rem;
          color: var(--muted);
          line-height: 1.4;
        }

        .btn-minimal {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: var(--secondary);
          color: white;
          border: none;
          border-radius: var(--radius-sm);
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-minimal:hover:not(:disabled) {
          background: var(--primary);
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm);
        }

        .btn-minimal:disabled {
          background: #e2e8f0;
          color: #94a3b8;
          cursor: not-allowed;
        }

        .subtle-note {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          color: var(--muted);
          font-size: 0.80rem;
          padding: 0 4px;
        }

        .subtle-note svg {
          color: #f59e0b;
        }

        .animate-fade-in {
          animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Settings;
