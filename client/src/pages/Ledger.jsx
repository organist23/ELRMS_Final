import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { History as HistoryIcon, Search, FileText } from 'lucide-react';

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
      const url = selectedEmpId ? `/ledger/history?employee_id=${selectedEmpId}` : '/ledger/history';
      const { data } = await api.get(url);
      setHistory(data);
    } catch (err) {
      console.error('Error fetching history', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await api.get('/employees');
      setEmployees(data);
    } catch (err) {
      console.error('Error fetching employees', err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [selectedEmpId]);

  const filteredHistory = history.filter(item => {
    const matchesEmp = selectedEmpId ? item.employee_id === selectedEmpId : true;
    const matchesSearch = 
      item.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.transaction_desc.toLowerCase().includes(searchQuery.toLowerCase());
    
    const actionDate = new Date(item.action_date);
    const matchesStart = startDate ? actionDate >= new Date(startDate) : true;
    const matchesEnd = endDate ? actionDate <= new Date(endDate + 'T23:59:59') : true;

    return matchesEmp && matchesSearch && matchesStart && matchesEnd;
  });

  return (
    <div>
      <header className="mb-32">
        <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>Ledger History</h1>
        <p style={{ color: 'var(--text-muted)' }}>Complete audit trail of all leave transactions, accruals, and balance updates.</p>
      </header>

      <div className="premium-card mb-32" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="input-field" 
            style={{ paddingLeft: '40px' }} 
            placeholder="Search by name, ID, or description..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select 
            className="input-field" 
            style={{ width: '220px' }}
            value={selectedEmpId}
            onChange={e => setSelectedEmpId(e.target.value)}
          >
            <option value="">All Employees</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.full_name}</option>
            ))}
          </select>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <input 
               type="date" 
               className="input-field" 
               style={{ width: '150px' }} 
               value={startDate}
               onChange={e => setStartDate(e.target.value)}
             />
             <span style={{ color: 'var(--text-muted)' }}>to</span>
             <input 
               type="date" 
               className="input-field" 
               style={{ width: '150px' }} 
               value={endDate}
               onChange={e => setEndDate(e.target.value)}
             />
          </div>

          <button className="btn-secondary" onClick={() => { setSelectedEmpId(''); setSearchQuery(''); setStartDate(''); setEndDate(''); }}>Clear Filters</button>
        </div>
      </div>

      <div className="premium-card">
        {filteredHistory.length > 0 ? (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Employee</th>
                  <th>Description</th>
                  <th>Balances After</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((record) => (
                  <tr key={record.id}>
                    <td style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{new Date(record.action_date).toLocaleString()}</td>
                    <td style={{ fontWeight: '700' }}>{record.full_name}</td>
                    <td style={{ fontSize: '0.875rem' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileText size={14} color="var(--primary)" />
                          {record.transaction_desc.replace(/\.000/g, '')}
                       </div>
                    </td>
                    <td>
                       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', fontSize: '0.75rem' }}>
                          <div style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: '4px' }}>
                             <span style={{ color: 'var(--text-muted)' }}>VL:</span> <strong>{Number(record.vl_bal)}</strong>
                          </div>
                          <div style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: '4px' }}>
                             <span style={{ color: 'var(--text-muted)' }}>SL:</span> <strong>{Number(record.sl_bal)}</strong>
                          </div>
                          <div style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: '4px' }}>
                             <span style={{ color: 'var(--text-muted)' }}>SP:</span> <strong>{Number(record.sp_bal)}</strong>
                          </div>
                          <div style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: '4px' }}>
                             <span style={{ color: 'var(--text-muted)' }}>FL:</span> <strong>{Number(record.fl_bal)}</strong>
                          </div>
                          <div style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: '4px' }}>
                             <span style={{ color: 'var(--text-muted)' }}>WL:</span> <strong>{Number(record.wl_bal)}</strong>
                          </div>
                          <div style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: '4px' }}>
                             <span style={{ color: 'var(--text-muted)' }}>SOLO:</span> <strong>{Number(record.spl_bal)}</strong>
                          </div>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <HistoryIcon size={48} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.2 }} />
            <p>No historical records found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Ledger;
