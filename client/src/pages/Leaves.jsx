import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { CheckCircle, XCircle, Clock, Info, RotateCcw } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const Leaves = () => {
  const { showToast, confirm } = useNotification();
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

  const handleAction = async (id, action, leave = null) => {
    let confirmTitle = 'Confirm Action';
    let confirmMsg = `Are you sure you want to ${action} this leave application? This will update employee balances and creates a ledger record.`;

    // Special confirmation for Force Leave rejection
    if (action === 'reject' && leave?.leave_type === 'Force Leave') {
      confirmTitle = 'Exigency of Service';
      confirmMsg = `Exigency of service: the ${Number(leave.num_days)} day(s) of Force Leave will be transferred to the VL. Proceed?`;
    }

    const isConfirmed = await confirm(confirmTitle, confirmMsg);
    if (!isConfirmed) return;

    try {
      await api.post(`/leaves/${action}`, { application_id: id });
      showToast(`${action.charAt(0).toUpperCase() + action.slice(1)} completed successfully.`, 'success');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || `Failed to ${action}`, 'error');
    }
  };

  if (loading) return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--secondary)' }}>Loading Queue...</div>;

  return (
    <div className="fade-in">
      <header className="mb-40">
        <h1 className="font-bold mb-8" style={{ fontSize: '2.25rem' }}>Approval Queue</h1>
        <p className="text-muted">Review and process pending leave applications. Logic is applied upon approval.</p>
      </header>

      <div className="premium-card mb-40">
        <h3 className="flex items-center gap-10 mb-24 font-bold" style={{ fontSize: '1.25rem' }}>
           <Clock size={22} color="var(--accent)" />
           <span>Pending Requests</span>
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
                    <td className="text-small" style={{ color: 'var(--secondary)' }}>{new Date(leave.applied_at).toLocaleDateString()}</td>
                    <td className="font-bold" style={{ fontSize: '0.9375rem' }}>{leave.full_name}</td>
                    <td className="font-bold" style={{ color: 'var(--accent)' }}>{leave.leave_type}</td>
                    <td>
                      <div className="font-bold">{Number(leave.num_days)} Days</div>
                      <div className="text-small font-bold" style={{ color: 'var(--accent)', opacity: 0.8 }}>{leave.inclusive_dates}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-primary" style={{ padding: '8px 16px', background: 'var(--success)', fontSize: '0.8125rem' }} onClick={() => handleAction(leave.id, 'approve', leave)}>Approve</button>
                        <button className="btn-primary" style={{ padding: '8px 16px', background: 'var(--danger)', fontSize: '0.8125rem' }} onClick={() => handleAction(leave.id, 'reject', leave)}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p className="text-muted">No pending applications found in the queue.</p>
          </div>
        )}
      </div>

      <div className="premium-card mb-40">
        <h3 className="flex items-center gap-10 mb-24 font-bold" style={{ fontSize: '1.25rem' }}>
           <CheckCircle size={22} color="var(--success)" />
           <span>Processed Applications</span>
        </h3>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Employee</th>
                <th>Details</th>
                <th>Pay Breakdown</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {historyLeaves.map(leave => (
                <tr key={leave.id}>
                  <td>
                    <span className={`badge ${leave.status === 'Approved' ? 'badge-approved' : 'badge-rejected'}`}>
                       {leave.status}
                    </span>
                  </td>
                  <td className="font-bold">{leave.full_name}</td>
                  <td className="text-small">
                    <div className="font-bold" style={{ color: 'var(--primary)' }}>{leave.leave_type} • {Number(leave.num_days)} Days</div>
                    <div className="text-muted font-bold" style={{ fontSize: '0.7rem' }}>{leave.inclusive_dates}</div>
                  </td>
                  <td>
                    {leave.status === 'Approved' && (
                       <div style={{ display: 'flex', gap: '12px' }}>
                         <span className="font-bold" style={{ color: 'var(--success)', fontSize: '0.75rem' }}>PAID: {Number(leave.with_pay)}</span>
                         <span className="font-bold" style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>W/O: {Number(leave.without_pay)}</span>
                       </div>
                    )}
                  </td>
                  <td>
                    {leave.status === 'Approved' && (
                      <button 
                        className="btn-undo" 
                        onClick={() => handleAction(leave.id, 'undo')}
                      >
                        <RotateCcw size={14} />
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

      <div className="premium-card flex items-center gap-16" style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)', opacity: 0.9 }}>
         <div className="flex items-center justify-center" style={{ flexShrink: 0 }}>
           <Info size={24} color="var(--accent)" />
         </div>
         <p className="text-small font-bold" style={{ color: 'var(--accent)', lineHeight: '1.4' }}>
           <strong>Note:</strong> Approving an application will automatically deduct the specified days from the employee's current credits and create a permanent ledger record for historical auditing.
         </p>
      </div>
    </div>
  );
};

export default Leaves;
