import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { History as HistoryIcon, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

const Ledger = () => {
  const [history, setHistory] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Improved Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Fetch all active employees ONCE for the filter dropdown
  const fetchEmployees = async () => {
    try {
      const { data: employeesRes } = await api.get('/employees?limit=1000');
      setEmployees(employeesRes.data || []);
    } catch (err) {
      console.error('Error fetching employees list', err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Reset page to 1 whenever dropdown filters or date ranges change
  useEffect(() => {
    setPage(1);
  }, [selectedEmpId, startDate, endDate]);

  // Fetch paginated and filtered history directly from database
  const fetchHistory = async () => {
    try {
      setLoading(true);
      
      const queryParams = new URLSearchParams({
        page: page,
        limit: 20 // Improved pagination limit: 20 records per page
      });
      
      if (selectedEmpId) queryParams.append('employee_id', selectedEmpId);
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const { data: historyRes } = await api.get(`/ledger/history?${queryParams.toString()}`);
      setHistory(historyRes.data || []);
      setTotalPages(historyRes.totalPages || 1);
      setTotal(historyRes.total || 0);
    } catch (err) {
      console.error('Error fetching ledger history', err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger refetch when page, employee, or dates change
  useEffect(() => {
    fetchHistory();
  }, [page, selectedEmpId, startDate, endDate]);

  if (loading && history.length === 0) return <div className="loading-state">Loading Ledger...</div>;

  return (
    <div className="fade-in">
      <header className="mb-40">
        <h1 className="font-bold mb-8" style={{ fontSize: '2.25rem' }}>Ledger History</h1>
        <p className="text-muted">Complete audit trail of all leave-related transactions and balance adjustments.</p>
      </header>

      <div className="premium-card mb-40" style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
        {/* Title */}
        <h3 className="flex items-center gap-10 font-bold" style={{ fontSize: '1rem', flexShrink: 0, whiteSpace: 'nowrap' }}>
          <Clock size={18} color="var(--accent)" />
          Ledger Filters
        </h3>

        {/* Controls */}
        <div className="flex items-center gap-12" style={{ flex: 1, flexWrap: 'wrap' }}>
          {/* Employee Filter */}
          <select
            className="input-field"
            style={{ width: '250px', flexShrink: 0 }}
            value={selectedEmpId}
            onChange={e => setSelectedEmpId(e.target.value)}
          >
            <option value="">All Employees</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.full_name}</option>
            ))}
          </select>

          {/* Date Range */}
          <div className="flex items-center gap-8" style={{ background: 'var(--primary-light)', padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', flexShrink: 0 }}>
            <span className="text-small font-bold text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Range</span>
            <input
              type="date"
              className="input-field"
              style={{ width: '130px', padding: '4px 8px', border: 'none', background: 'transparent', fontWeight: 700 }}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
            <span className="text-muted">→</span>
            <input
              type="date"
              className="input-field"
              style={{ width: '130px', padding: '4px 8px', border: 'none', background: 'transparent', fontWeight: 700 }}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>

          {/* Reset */}
          <button
            className="btn-secondary"
            style={{ padding: '10px 20px', flexShrink: 0 }}
            onClick={() => { setSelectedEmpId(''); setStartDate(''); setEndDate(''); }}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="premium-card">
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee ID</th>
                <th>Employee Name</th>
                <th>Description</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id}>
                  <td className="text-small font-bold text-secondary">{new Date(item.action_date).toLocaleDateString()}</td>
                  <td className="text-small font-bold">{item.employee_id}</td>
                  <td className="font-bold">{item.full_name}</td>
                  <td>
                    <div className="font-bold text-primary mb-4">
                      {(item.transaction_desc || '').replace(/\.000/g, '')}
                    </div>
                    <div className="flex gap-12 text-small text-muted">
                      <span>VL Bal: <strong>{Number(item.vl_bal)}</strong></span>
                      <span>SL Bal: <strong>{Number(item.sl_bal)}</strong></span>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-approved" style={{ fontSize: '0.65rem' }}>LOGGED</span>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-light)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <HistoryIcon size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
                      No audit records match your current filters.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Elegant Pagination Switcher */}
        {totalPages > 1 && (
          <div className="flex-between mt-24" style={{ padding: '0 8px' }}>
            <span className="text-small text-muted font-bold">
              Showing {history.length} of {total} records (Page {page} of {totalPages})
            </span>
            <div className="flex items-center gap-8">
              <button 
                className="pagination-btn" 
                disabled={page === 1 || loading}
                onClick={() => setPage(prev => prev - 1)}
                title="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-4">
                {[...Array(totalPages)].map((_, i) => {
                  const pg = i + 1;
                  if (totalPages > 7) {
                    if (pg !== 1 && pg !== totalPages && Math.abs(pg - page) > 1) {
                       if (pg === page - 2 || pg === page + 2) return <span key={pg} style={{ color: 'var(--text-light)', padding: '0 4px' }}>...</span>;
                       return null;
                    }
                  }
                  return (
                    <button
                      key={pg}
                      className={`pagination-num ${page === pg ? 'active' : ''}`}
                      onClick={() => setPage(pg)}
                      disabled={loading}
                    >
                      {pg}
                    </button>
                  );
                })}
              </div>

              <button 
                className="pagination-btn" 
                disabled={page === totalPages || loading}
                onClick={() => setPage(prev => prev + 1)}
                title="Next Page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Ledger;
