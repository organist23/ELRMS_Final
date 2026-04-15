import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Users, FileClock, Activity, AlertCircle } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({ totalEmployees: 0, pendingApproval: 0 });
  const [recentLedger, setRecentLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, ledgerRes] = await Promise.all([
          api.get('/stats'),
          api.get('/ledger/history?limit=10')
        ]);
        setStats(statsRes.data);
        setRecentLedger(ledgerRes.data);
      } catch (err) {
        console.error('Error fetching dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div>Loading Dashboard...</div>;

  return (
    <div>
      <header className="mb-32">
        <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>Welcome Admin!</h1>
        <p style={{ color: 'var(--text-muted)' }}>Overview of employee records and leave statuses.</p>
      </header>

      <div className="stat-grid">
        <div className="premium-card stat-card">
          <div className="icon-box icon-blue"><Users size={24} /></div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: '500' }}>Total Employees</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700' }}>{stats.totalEmployees}</h3>
          </div>
        </div>
        <div className="premium-card stat-card">
          <div className="icon-box icon-yellow"><FileClock size={24} /></div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: '500' }}>Pending Approval</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700' }}>{stats.pendingApproval}</h3>
          </div>
        </div>
      </div>

      <div className="recent-activity premium-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Recent Ledger Activity</h3>
          <button className="btn-secondary" style={{ fontSize: '0.875rem' }}>View All</button>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Transaction Details</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentLedger.length > 0 ? recentLedger.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{new Date(item.action_date).toLocaleDateString()}</td>
                  <td style={{ fontWeight: '700' }}>{item.full_name}</td>
                  <td style={{ fontSize: '0.875rem' }}>
                    <div style={{ fontWeight: '500', color: 'var(--primary)', marginBottom: '4px' }}>
                      {item.transaction_desc.replace(/\.000/g, '')}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      <span>VL: {Number(item.vl_bal)}</span>
                      <span>SL: {Number(item.sl_bal)}</span>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-approved" style={{ fontSize: '0.7rem' }}>Logged</span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <AlertCircle size={48} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.2 }} />
                    No recent activity found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
