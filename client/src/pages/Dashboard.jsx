import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Users, FileClock, Activity, AlertCircle, Search, RefreshCw, FileText } from 'lucide-react';

const Dashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({ totalEmployees: 0, pendingApproval: 0 });
  const [audit, setAudit] = useState(null);
  const [recentLedger, setRecentLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAudit = async () => {
    try {
      const { data } = await api.get('/system/audit');
      setAudit(data);
    } catch (err) {
      console.error('Audit failed', err);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, []);



  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, ledgerRes] = await Promise.all([
          api.get('/stats'),
          api.get('/ledger/history?limit=10')
        ]);
        setStats(statsRes.data);
        // Correctly handle paginated object response
        setRecentLedger(ledgerRes.data.data || []);
      } catch (err) {
        console.error('Error fetching dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--secondary)' }}>Loading Dashboard...</div>;

  return (
    <div className="fade-in">
      {/* Header */}
      <header className="mb-40" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
        
        {/* Left: Title */}
        <div>
          <h1 className="font-extrabold" style={{ fontSize: '2.5rem', letterSpacing: '-1.5px', marginBottom: '4px' }}>Welcome Admin!</h1>
          <p className="text-muted font-medium">System Overview • Real-time Monitoring</p>
        </div>

        {/* Right: Clock */}
        <div className="premium-card" style={{ textAlign: 'center', minWidth: '200px', padding: '16px 28px', flexShrink: 0 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
            {formatDate(currentTime)}
          </p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', lineHeight: '1', letterSpacing: '-0.5px' }}>
            {formatTime(currentTime)}
          </p>
        </div>
      </header>

      {/* System Audit Alerts */}
      {audit && (audit.pendingAccrual || audit.pendingRollover) && (
        <div className="mb-40 flex flex-col gap-16">
          {audit.pendingRollover && (
            <div className="premium-card flex items-center gap-24 p-24" style={{ background: 'var(--accent-light)', border: '1.5px solid var(--accent)', boxShadow: 'none' }}>
              <div className="flex items-center gap-20">
                <div className="icon-box" style={{ background: 'white', color: 'var(--accent)' }}>
                   <RefreshCw size={24} />
                </div>
                <div>
                  <h4 className="font-bold" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent)' }}>Annual System Maintenance</h4>
                  <p className="font-medium" style={{ color: 'var(--primary)', opacity: 0.8 }}>
                    The yearly rollover for <strong>{audit.prevYear}</strong> is ready to be processed. This will update the system calendar and forward leave balances.
                  </p>
                </div>
              </div>
            </div>
          )}

          {audit.pendingAccrual && (
            <div className="premium-card flex items-center gap-24 p-24" style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', boxShadow: 'none' }}>
              <div className="flex items-center gap-20">
                <div className="icon-box" style={{ background: 'white', color: '#64748b' }}>
                   <FileText size={24} />
                </div>
                <div>
                  <h4 className="font-bold" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569' }}>Monthly Credit Update</h4>
                  <p className="font-medium" style={{ color: '#475569', opacity: 0.8 }}>
                    Monthly VL/SL credit generation is available for the current period.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="stat-grid">
        <div className="premium-card stat-card">
          <div className="icon-box icon-blue"><Users size={24} /></div>
          <div>
            <p className="text-small text-muted font-bold" style={{ textTransform: 'uppercase' }}>Total Employees</p>
            <h3 style={{ fontSize: '1.75rem', fontWeight: '800' }}>{stats.totalEmployees}</h3>
          </div>
        </div>
        <div className="premium-card stat-card">
          <div className="icon-box icon-yellow"><FileClock size={24} /></div>
          <div>
            <p className="text-small text-muted font-bold" style={{ textTransform: 'uppercase' }}>Pending Approval</p>
            <h3 style={{ fontSize: '1.75rem', fontWeight: '800' }}>{stats.pendingApproval}</h3>
          </div>
        </div>
      </div>

      <div className="premium-card">
        <div className="flex-between mb-24 gap-20">
          <h3 className="font-bold" style={{ fontSize: '1.25rem' }}>Recent Ledger Activity</h3>
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
                  <td className="text-small" style={{ whiteSpace: 'nowrap', color: 'var(--secondary)' }}>
                    {new Date(item.action_date).toLocaleDateString()}
                  </td>
                  <td className="font-bold">{item.full_name}</td>
                  <td>
                    <div style={{ fontWeight: '600', color: 'var(--primary)', marginBottom: '4px' }}>
                      {(item.transaction_desc || '').replace(/\.000/g, '')}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>VL: <strong>{Number(item.vl_bal)}</strong></span>
                      <span>SL: <strong>{Number(item.sl_bal)}</strong></span>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-approved" style={{ fontSize: '0.65rem' }}>Logged</span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '64px', color: 'var(--text-light)' }}>
                    <AlertCircle size={48} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.1 }} />
                    <p>No recent activity found.</p>
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
