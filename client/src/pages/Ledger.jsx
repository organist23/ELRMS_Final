import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { History as HistoryIcon, Search, Clock } from 'lucide-react';

const Ledger = () => {
  const [history, setHistory] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const [{ data: historyData }, { data: employeesData }] = await Promise.all([
        api.get('/ledger/history'),
        api.get('/employees')
      ]);
      setHistory(historyData);
      setEmployees(employeesData);
    } catch (err) {
      console.error('Error fetching ledger history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredHistory = history.filter(item => {
    const matchesEmp = selectedEmpId ? item.employee_id === selectedEmpId : true;
    const matchesSearch = 
      (item.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.employee_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.transaction_desc || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const actionDate = new Date(item.action_date);
    const matchesStart = startDate ? actionDate >= new Date(startDate) : true;
    const matchesEnd = endDate ? actionDate <= new Date(endDate + 'T23:59:59') : true;

    return matchesEmp && matchesSearch && matchesStart && matchesEnd;
  });

  if (loading) return <div className="loading-state">Loading Ledger...</div>;

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
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '40px' }}
              placeholder="Search by name, ID or details..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Employee Filter */}
          <select
            className="input-field"
            style={{ width: '200px', flexShrink: 0 }}
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
            onClick={() => { setSelectedEmpId(''); setSearchQuery(''); setStartDate(''); setEndDate(''); }}
          >
            Reset
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
              {filteredHistory.map((item) => (
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
              {filteredHistory.length === 0 && (
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
      </div>
    </div>
  );
};

export default Ledger;
