import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';
import { CheckCircle, XCircle, Clock, Info, RotateCcw, RotateCw, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const Leaves = () => {
  const location = useLocation(); // Used to detect page navigation and re-sync is_closed state
  const { showToast, confirm, showUndoToast } = useNotification();
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [historyLeaves, setHistoryLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // History Pagination
  const [historyPage, setHistoryPage] = useState(1);
  const [totalHistoryPages, setTotalHistoryPages] = useState(1);
  const [totalHistoryRecords, setTotalHistoryRecords] = useState(0);
  const [tardyRecords, setTardyRecords] = useState([]);

  // Tardy Pagination
  const [tardyPage, setTardyPage] = useState(1);
  const tardyLimit = 10;

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Pending
      const pendingRes = await api.get('/leaves/pending').catch(err => {
        console.error('Pending fetch failed', err);
        return { data: [] };
      });
      setPendingLeaves(pendingRes.data);

      // Fetch Tardy
      const tardyRes = await api.get('/tardy').catch(err => {
        console.error('Tardy fetch failed', err);
        return { data: [] };
      });
      setTardyRecords(tardyRes.data);

      // Fetch History
      const historyRes = await api.get(`/leaves/history?page=${historyPage}`).catch(err => {
        console.error('History fetch failed', err);
        return { data: { data: [], totalPages: 1, total: 0 } };
      });
      setHistoryLeaves(historyRes.data.data || []);
      setTotalHistoryPages(historyRes.data.totalPages || 1);
      setTotalHistoryRecords(historyRes.data.total || 0);

    } catch (err) {
      console.error('Critical fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  // location.pathname ensures fresh is_closed values are fetched every time
  // the user navigates back to this page from another page (e.g. after generating credits)
  }, [historyPage, location.pathname]);

  useEffect(() => {
    setTardyPage(1);
  }, [search]);

  const handleAction = async (id, action, leave = null) => {
    if (processing) return; // Prevent overlapping actions

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
      setProcessing(true);
      await api.post(`/leaves/${action}`, { application_id: id });
      showToast(`${action.charAt(0).toUpperCase() + action.slice(1)} completed successfully.`, 'success');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || `Failed to ${action}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleTardyAction = async (tardyId, action) => {
    if (processing) return;
    const label = action === 'undo' ? 'Undo Deduction' : 'Redo Deduction';
    const msg = action === 'undo'
      ? 'This will restore the deducted VL back to the employee. Proceed?'
      : 'This will re-apply the VL deduction. Proceed?';
    const confirmed = await confirm(label, msg);
    if (!confirmed) return;

    try {
      setProcessing(true);
      await api.post(`/tardy/${action}`, { tardy_id: tardyId });
      showToast(`${label} completed successfully.`, 'success');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || `Failed to ${action} tardy`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const filteredPending = pendingLeaves.filter(l =>
    (l.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.employee_id || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredHistory = historyLeaves.filter(l =>
    (l.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.employee_id || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredTardy = tardyRecords.filter(t =>
    (t.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.employee_id || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalTardyPages = Math.ceil(filteredTardy.length / tardyLimit);
  const paginatedTardy = filteredTardy.slice(
    (tardyPage - 1) * tardyLimit,
    tardyPage * tardyLimit
  );

  if (loading) return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--secondary)' }}>Loading Queue...</div>;

  return (
    <div className="fade-in">
      <header className="flex-between mb-40">
        <div>
          <h1 className="font-bold mb-8" style={{ fontSize: '2.25rem' }}>Approval Queue</h1>
          <p className="text-muted">Review and process pending leave applications. Logic is applied upon approval.</p>
        </div>

        <div style={{ position: 'relative', width: '350px' }}>
          <Search size={18} className="search-icon" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
          <input
            type="text"
            className="input-field"
            style={{ paddingLeft: '44px' }}
            placeholder="Search by Employee or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </header>

      <div className="premium-card mb-40">
        <h3 className="flex items-center gap-10 mb-24 font-bold" style={{ fontSize: '1.25rem' }}>
          <Clock size={22} color="var(--accent)" />
          <span>Pending Requests</span>
        </h3>
        {filteredPending.length > 0 ? (
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
                {filteredPending.map((leave) => (
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
                        <button 
                          className="btn-primary" 
                          style={{ padding: '8px 16px', background: 'var(--success)', fontSize: '0.8125rem', opacity: processing ? 0.5 : 1, cursor: processing ? 'not-allowed' : 'pointer' }} 
                          onClick={() => handleAction(leave.id, 'approve', leave)}
                          disabled={processing}
                        >
                          {processing ? '...' : 'Approve'}
                        </button>
                        <button 
                          className="btn-primary" 
                          style={{ padding: '8px 16px', background: 'var(--danger)', fontSize: '0.8125rem', opacity: processing ? 0.5 : 1, cursor: processing ? 'not-allowed' : 'pointer' }} 
                          onClick={() => handleAction(leave.id, 'reject', leave)}
                          disabled={processing}
                        >
                          {processing ? '...' : 'Disapprove'}
                        </button>
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
          <span>Processed Leaves</span>
        </h3>
        {filteredHistory.length > 0 ? (
          <>
            <div className="data-table-container leaves-scroll-container">
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
                  {filteredHistory.map(leave => (
                    <tr key={`leave-${leave.id}`}>
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
                            disabled={processing || leave.is_closed}
                            style={{ 
                              opacity: (processing || leave.is_closed) ? 0.5 : 1, 
                              cursor: (processing || leave.is_closed) ? 'not-allowed' : 'pointer',
                              background: leave.is_closed ? '#e2e8f0' : '',
                              color: leave.is_closed ? '#94a3b8' : '',
                              border: leave.is_closed ? '1px solid #cbd5e1' : ''
                            }}
                            title={leave.is_closed ? "Cannot undo leaves from a closed month" : "Undo Approval"}
                          >
                            <RotateCcw size={14} />
                            {leave.is_closed ? 'Undo Locked' : (processing ? '...' : 'Undo Approval')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* History Pagination Controls */}
            {totalHistoryPages > 1 && (
              <div className="flex-between mt-24" style={{ padding: '0 8px' }}>
                <span className="text-small text-muted font-bold">
                  Showing {filteredHistory.length} of {totalHistoryRecords} records
                </span>
                <div className="flex items-center gap-8">
                  <button 
                    className="pagination-btn" 
                    disabled={historyPage === 1 || loading}
                    onClick={() => setHistoryPage(prev => prev - 1)}
                    title="Previous Page"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="flex items-center gap-4">
                    {[...Array(totalHistoryPages)].map((_, i) => {
                      const pg = i + 1;
                      if (totalHistoryPages > 7) {
                        if (pg !== 1 && pg !== totalHistoryPages && Math.abs(pg - historyPage) > 1) {
                           if (pg === historyPage - 2 || pg === historyPage + 2) return <span key={pg} style={{ color: 'var(--text-light)', padding: '0 4px' }}>...</span>;
                           return null;
                        }
                      }
                      return (
                        <button
                          key={pg}
                          className={`pagination-num ${historyPage === pg ? 'active' : ''}`}
                          onClick={() => setHistoryPage(pg)}
                          disabled={loading}
                        >
                          {pg}
                        </button>
                      );
                    })}
                  </div>

                  <button 
                    className="pagination-btn" 
                    disabled={historyPage === totalHistoryPages || loading}
                    onClick={() => setHistoryPage(prev => prev + 1)}
                    title="Next Page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p className="text-muted">No processed leaves found.</p>
          </div>
        )}
      </div>

      <div className="premium-card mb-40">
        <h3 className="flex items-center gap-10 mb-24 font-bold" style={{ fontSize: '1.25rem' }}>
          <Clock size={22} color="var(--accent)" />
          <span>Tardy Deductions</span>
        </h3>
        {filteredTardy.length > 0 ? (
          <>
            <div className="data-table-container leaves-scroll-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Employee</th>
                    <th>Details</th>
                    <th>VL Deduction</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTardy.map(tardy => (
                    <tr key={`tardy-${tardy.id}`}>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '999px',
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            letterSpacing: '0.05em',
                            background: tardy.status === 'Deducted' ? '#fef3c7' : '#f1f5f9',
                            color: tardy.status === 'Deducted' ? '#92400e' : '#64748b',
                            border: `1px solid ${tardy.status === 'Deducted' ? '#fcd34d' : '#cbd5e1'}`
                          }}>
                          {tardy.status === 'Deducted' ? 'DEDUCTED' : 'UNDONE'}
                        </span>
                      </td>
                      <td className="font-bold">{tardy.full_name}</td>
                      <td className="text-small">
                        <div className="font-bold" style={{ color: 'var(--primary)' }}>
                          <Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                          Tardy • {parseFloat(tardy.equivalent_day)} Days
                        </div>
                        <div className="text-muted font-bold" style={{ fontSize: '0.7rem' }}>
                          {tardy.period_text}{tardy.remarks ? ` • ${tardy.remarks}` : ''}
                        </div>
                      </td>
                      <td>
                        {tardy.status === 'Deducted' && (
                          <span className="font-bold" style={{ color: 'var(--success)', fontSize: '0.75rem' }}>
                            PAID: {parseFloat(tardy.equivalent_day)}
                          </span>
                        )}
                      </td>
                      <td>
                        {tardy.status === 'Deducted' ? (
                          <button
                            className="btn-undo"
                            onClick={() => handleTardyAction(tardy.id, 'undo')}
                            disabled={processing || tardy.is_closed}
                            style={{ 
                              opacity: (processing || tardy.is_closed) ? 0.5 : 1, 
                              cursor: (processing || tardy.is_closed) ? 'not-allowed' : 'pointer',
                              background: tardy.is_closed ? '#e2e8f0' : '',
                              color: tardy.is_closed ? '#94a3b8' : '',
                              border: tardy.is_closed ? '1px solid #cbd5e1' : ''
                            }}
                            title={tardy.is_closed ? "Cannot undo deductions from a closed month" : "Undo Deduction"}
                          >
                            <RotateCcw size={14} />
                            {tardy.is_closed ? 'Undo Locked' : (processing ? '...' : 'Undo Deduction')}
                          </button>
                        ) : (
                          <button
                            className="btn-primary"
                            onClick={() => handleTardyAction(tardy.id, 'redo')}
                            disabled={processing}
                            style={{ padding: '6px 14px', fontSize: '0.75rem', opacity: processing ? 0.5 : 1, cursor: processing ? 'not-allowed' : 'pointer' }}
                          >
                            <RotateCw size={14} />
                            {processing ? '...' : 'Redo Deduction'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tardy Pagination Controls */}
            {totalTardyPages > 1 && (
              <div className="flex-between mt-24" style={{ padding: '0 8px' }}>
                <span className="text-small text-muted font-bold">
                  Showing {paginatedTardy.length} of {filteredTardy.length} tardy deductions
                </span>
                <div className="flex items-center gap-8">
                  <button 
                    className="pagination-btn" 
                    disabled={tardyPage === 1 || loading}
                    onClick={() => setTardyPage(prev => prev - 1)}
                    title="Previous Page"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="flex items-center gap-4">
                    {[...Array(totalTardyPages)].map((_, i) => {
                      const pg = i + 1;
                      if (totalTardyPages > 7) {
                        if (pg !== 1 && pg !== totalTardyPages && Math.abs(pg - tardyPage) > 1) {
                           if (pg === tardyPage - 2 || pg === tardyPage + 2) return <span key={pg} style={{ color: 'var(--text-light)', padding: '0 4px' }}>...</span>;
                           return null;
                        }
                      }
                      return (
                        <button
                          key={pg}
                          className={`pagination-num ${tardyPage === pg ? 'active' : ''}`}
                          onClick={() => setTardyPage(pg)}
                          disabled={loading}
                        >
                          {pg}
                        </button>
                      );
                    })}
                  </div>

                  <button 
                    className="pagination-btn" 
                    disabled={tardyPage === totalTardyPages || loading}
                    onClick={() => setTardyPage(prev => prev + 1)}
                    title="Next Page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p className="text-muted">No tardy deductions found.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default Leaves;
