import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { CheckCircle, XCircle, Clock, Info } from 'lucide-react';

const Leaves = () => {
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [historyLeaves, setHistoryLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [pending, history] = await Promise.all([
        api.get('/leaves/pending'),
        api.get('/leaves/history')
      ]);
      setPendingLeaves(pending.data);
      setHistoryLeaves(history.data);
    } catch (err) {
       console.error('Error fetching data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (id, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this leave application?`)) return;
    try {
      await api.post(`/leaves/${action}`, { application_id: id });
      alert(`Action completed successfully.`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || `Failed to perform ${action}`);
    }
  };

  if (loading) return <div>Loading Queue...</div>;

  return (
    <div>
      <header className="mb-32">
        <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>Approval Queue</h1>
        <p style={{ color: 'var(--text-muted)' }}>Review and process pending leave applications. Logic is applied upon approval.</p>
      </header>

      <div className="premium-card mb-32">
        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
           <Clock size={20} color="var(--primary)" />
           Pending Requests
        </h3>
        {pendingLeaves.length > 0 ? (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Applied On</th>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Duration</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingLeaves.map((leave) => (
                  <tr key={leave.id}>
                    <td style={{ fontSize: '0.8125rem' }}>{new Date(leave.applied_at).toLocaleDateString()}</td>
                    <td style={{ fontWeight: '700' }}>{leave.full_name}</td>
                    <td style={{ fontWeight: '500', color: 'var(--primary)' }}>{leave.leave_type}</td>
                    <td style={{ fontSize: '0.875rem' }}>
                      <div style={{ fontWeight: '600' }}>{leave.num_days} Days</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600' }}>{leave.inclusive_dates}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-primary" style={{ padding: '6px 12px', background: 'var(--success)', fontSize: '0.8125rem' }} onClick={() => handleAction(leave.id, 'approve')}>Approve</button>
                        <button className="btn-primary" style={{ padding: '6px 12px', background: 'var(--danger)', fontSize: '0.8125rem' }} onClick={() => handleAction(leave.id, 'reject')}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No pending applications</p>
        )}
      </div>

      <div className="premium-card">
        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
           <CheckCircle size={20} color="var(--success)" />
           Processed Applications (Recent)
        </h3>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Employee</th>
                <th>Details</th>
                <th>Split Pay Info</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {historyLeaves.map(leave => (
                <tr key={leave.id}>
                  <td>
                    <span className={`badge ${leave.status === 'Approved' ? 'badge-approved' : 'badge-pending'}`} style={{ background: leave.status === 'Rejected' ? '#fee2e2' : '', color: leave.status === 'Rejected' ? '#991b1b' : '' }}>
                       {leave.status}
                    </span>
                  </td>
                  <td style={{ fontWeight: '600' }}>{leave.full_name}</td>
                  <td style={{ fontSize: '0.875rem' }}>
                    <div>{leave.leave_type} - {leave.num_days} Days</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{leave.inclusive_dates}</div>
                  </td>
                  <td style={{ fontSize: '0.75rem' }}>
                    {leave.status === 'Approved' && (
                       <div style={{ display: 'flex', gap: '8px' }}>
                         <span style={{ color: 'var(--success)' }}>Paid: {leave.with_pay}</span>
                         <span style={{ color: 'var(--danger)' }}>W/O Pay: {leave.without_pay}</span>
                       </div>
                    )}
                  </td>
                  <td>
                    {leave.status === 'Approved' && (
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'var(--warning)', color: 'var(--warning)' }}
                        onClick={() => handleAction(leave.id, 'undo')}
                      >
                        Undo Approval
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ marginTop: '32px', background: '#eff6ff', padding: '20px', borderRadius: '12px', border: '1px solid #bfdbfe', display: 'flex', gap: '16px' }}>
         <Info color="#3b82f6" />
         <p style={{ fontSize: '0.875rem', color: '#1e40af' }}>
           <strong>Note:</strong> Approving an application will automatically deduct the specified days from the employee's current credits and create a ledger record for historical tracking.
         </p>
      </div>
    </div>
  );
};

export default Leaves;
