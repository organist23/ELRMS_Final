import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { ClipboardList, Search, Calendar, Printer, Download, User, X } from 'lucide-react';

const LedgerSummary = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [empSearch, setEmpSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [ledgerData, setLedgerData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [empLoading, setEmpLoading] = useState(true);

  // Fetch employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        // Fetch a large number for the searchable dropdown
        const { data: res } = await api.get('/employees?limit=1000');
        setEmployees(res.data || []);
      } catch (err) {
        console.error('Error fetching employees', err);
      } finally {
        setEmpLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  // Fetch ledger when selection changes
  const fetchLedger = async () => {
    if (!selectedEmpId) return;
    setLoading(true);
    try {
      // Fetch a large limit for the annual report to ensure all records for the year are included
      const { data: res } = await api.get(`/ledger/history?employee_id=${selectedEmpId}&limit=500`);
      const history = res.data || [];
      
      // Filter by year using a more robust local date check
      const filtered = history.filter(item => {
        const d = new Date(item.action_date);
        return d.toLocaleDateString('en-US', { year: 'numeric' }) === year.toString();
      });
      // Sort chronologically (oldest first for a story-like audit)
      setLedgerData(filtered.sort((a, b) => new Date(a.action_date) - new Date(b.action_date)));
    } catch (err) {
      console.error('Error fetching ledger', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [selectedEmpId, year]);

  const handlePrint = () => window.print();

  const handleExportPDF = () => {
    if (window.electronAPI && window.electronAPI.exportPDF) {
      window.electronAPI.exportPDF();
    } else {
      window.print();
    }
  };

  const selectedEmployee = employees.find(e => e.id === selectedEmpId);

  return (
    <div className="fade-in">
      <header className="no-print mb-32 flex-between">
        <div>
          <h1 className="font-bold mb-8" style={{ fontSize: '2.25rem' }}>Ledger Summary</h1>
          <p className="text-muted">Generate a chronological activity report for any employee by year.</p>
        </div>
        
        <div className="flex gap-12">
          <button className="btn-primary" onClick={handlePrint} disabled={!selectedEmpId || ledgerData.length === 0}>
            <Printer size={18} /> Print Report
          </button>
          <button className="btn-export" onClick={handleExportPDF} disabled={!selectedEmpId || ledgerData.length === 0}>
            <Download size={18} /> Export PDF
          </button>
        </div>
      </header>

      {/* Lookup Controls */}
      <div className="premium-card no-print mb-40 flex items-center gap-24">
        <div className="flex flex-col gap-8" style={{ flex: 1, position: 'relative' }}>
          <label className="label" style={{ fontSize: '0.7rem' }}>Select Employee</label>
          <div style={{ position: 'relative' }}>
            <Search size={18} className="search-icon" style={{ opacity: 0.5 }} />
            <input 
              type="text"
              className="input-field"
              style={{ paddingLeft: '44px' }}
              placeholder="Type to search employee..."
              value={empSearch}
              onChange={(e) => {
                setEmpSearch(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              disabled={empLoading}
            />
            
            {empSearch && (
              <button 
                onClick={() => {
                  setEmpSearch('');
                  setSelectedEmpId('');
                  setLedgerData([]);
                  setShowDropdown(false);
                }}
                className="clear-search-btn"
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-light)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
              >
                <X size={16} />
              </button>
            )}

            {showDropdown && (
              <div className="search-results-dropdown shadow-lg">
                {employees
                  .filter(emp => 
                    emp.full_name.toLowerCase().includes(empSearch.toLowerCase()) || 
                    emp.id.toLowerCase().includes(empSearch.toLowerCase())
                  )
                  .map(emp => (
                    <div 
                      key={emp.id} 
                      className="search-result-item"
                      onClick={() => {
                        setSelectedEmpId(emp.id);
                        setEmpSearch(`${emp.full_name} (${emp.id})`);
                        setShowDropdown(false);
                      }}
                    >
                      <div className="font-bold" style={{ fontSize: '0.9rem' }}>{emp.full_name}</div>
                      <div className="text-small text-muted">{emp.id} • {emp.office}</div>
                    </div>
                  ))
                }
                {employees.filter(emp => 
                  emp.full_name.toLowerCase().includes(empSearch.toLowerCase()) || 
                  emp.id.toLowerCase().includes(empSearch.toLowerCase())
                ).length === 0 && (
                  <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                    No employees found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-8" style={{ width: '160px' }}>
          <label className="label" style={{ fontSize: '0.7rem' }}>Target Year</label>
          <div style={{ position: 'relative' }}>
            <Calendar size={18} className="search-icon" style={{ opacity: 0.5 }} />
            <select 
              className="input-field" 
              style={{ paddingLeft: '44px' }}
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
            >
              {(() => {
                const currentYear = new Date().getFullYear();
                let startYear = currentYear - 5; // Default fallback
                
                if (selectedEmployee && selectedEmployee.entrance_of_duty) {
                  startYear = new Date(selectedEmployee.entrance_of_duty).getFullYear();
                }

                const years = [];
                for (let y = currentYear; y >= startYear; y--) {
                  years.push(y);
                }
                return years.map(y => <option key={y} value={y}>{y}</option>);
              })()}
            </select>
          </div>
        </div>
      </div>

      {/* The Report View */}
      {selectedEmpId ? (
        <div className="report-container">
          <div className="report-card-header text-center mb-40">
             <h2 className="font-bold text-primary mb-4" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>Annual Ledger Activity Summary</h2>
             <p className="font-bold text-muted" style={{ textTransform: 'uppercase', fontSize: '0.9rem' }}>Calendar Year {year}</p>
          </div>

          <div className="employee-summary-strip mb-32">
             <div className="strip-item">
                <span className="label">Name</span>
                <span className="value">{selectedEmployee?.full_name}</span>
             </div>
             <div className="strip-item">
                <span className="label">Employee ID</span>
                <span className="value">{selectedEmployee?.id}</span>
             </div>
             <div className="strip-item">
                <span className="label">Office</span>
                <span className="value">{selectedEmployee?.office}</span>
             </div>
             <div className="strip-item">
                <span className="label">Status</span>
                <span className="value">{selectedEmployee?.status}</span>
             </div>
          </div>

          <div className="data-table-container shadow-sm" style={{ border: '1.5px solid #000', borderRadius: '0' }}>
            <table className="data-table summary-table">
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ width: '12%', color: '#000', borderRight: '1px solid #000' }}>Date</th>
                  <th style={{ width: '30%', color: '#000', borderRight: '1px solid #000' }}>Event Description</th>
                  <th style={{ width: '10%', color: '#000', borderRight: '1px solid #000', textAlign: 'center' }}>VL Bal</th>
                  <th style={{ width: '10%', color: '#000', borderRight: '1px solid #000', textAlign: 'center' }}>SL Bal</th>
                  <th style={{ width: '8%', color: '#000', borderRight: '1px solid #000', textAlign: 'center' }}>SP</th>
                  <th style={{ width: '8%', color: '#000', borderRight: '1px solid #000', textAlign: 'center' }}>FL</th>
                  <th style={{ width: '8%', color: '#000', borderRight: '1px solid #000', textAlign: 'center' }}>WL</th>
                  <th style={{ width: '8%', color: '#000', borderRight: 'selectedEmployee?.sex === "Female" ? "1px solid #000" : ""', textAlign: 'center' }}>SPL</th>
                  {selectedEmployee?.sex === 'Female' ? (
                    <>
                      <th style={{ width: '8%', color: '#000', borderRight: '1px solid #000', textAlign: 'center' }}>MAT</th>
                      <th style={{ width: '8%', color: '#000', textAlign: 'center' }}>SBW</th>
                    </>
                  ) : (
                    <th style={{ width: '8%', color: '#000', textAlign: 'center' }}>PAT</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                   <tr><td colSpan={selectedEmployee?.sex === 'Female' ? 10 : 9} className="text-center" style={{ padding: '40px' }}>Fetching ledger entries...</td></tr>
                ) : ledgerData.length > 0 ? (
                  ledgerData.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td className="text-small font-bold" style={{ borderRight: '1px solid #eee' }}>{new Date(item.action_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td style={{ borderRight: '1px solid #eee' }}>
                        <div className="font-bold text-primary" style={{ fontSize: '0.8rem' }}>{item.transaction_desc}</div>
                        {item.remarks && <div className="text-small text-muted italic mt-2">"{item.remarks}"</div>}
                      </td>
                      <td className="text-center font-bold balance-cell-vl" style={{ fontSize: '0.8rem' }}>{Number(item.vl_bal).toFixed(3)}</td>
                      <td className="text-center font-bold balance-cell-sl" style={{ fontSize: '0.8rem' }}>{Number(item.sl_bal).toFixed(3)}</td>
                      <td className="text-center" style={{ fontSize: '0.8rem' }}>{Number(item.sp_bal || 0)}</td>
                      <td className="text-center" style={{ fontSize: '0.8rem' }}>{Number(item.fl_bal || 0)}</td>
                      <td className="text-center" style={{ fontSize: '0.8rem' }}>{Number(item.wl_bal || 0)}</td>
                      <td className="text-center" style={{ fontSize: '0.8rem' }}>{Number(item.spl_bal || 0)}</td>
                      {selectedEmployee?.sex === 'Female' ? (
                        <>
                          <td className="text-center" style={{ fontSize: '0.8rem' }}>{Number(item.mat_bal || 0)}</td>
                          <td className="text-center" style={{ fontSize: '0.8rem' }}>{Number(item.sbw_bal || 0)}</td>
                        </>
                      ) : (
                        <td className="text-center" style={{ fontSize: '0.8rem' }}>{Number(item.pat_bal || 0)}</td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={selectedEmployee?.sex === 'Female' ? 10 : 9} style={{ textAlign: 'center', padding: '60px', color: 'var(--text-light)' }}>
                      No ledger transactions recorded for this employee in {year}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="report-footer mt-40 no-print" style={{ fontSize: '0.75rem', opacity: 0.6, textAlign: 'center' }}>
          </div>
        </div>
      ) : (
        <div className="premium-card" style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)' }}>
          <ClipboardList size={64} style={{ margin: '0 auto 24px', opacity: 0.1 }} />
          <h3 className="font-bold">Ready to Generate Summary</h3>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .report-container {
          background: white;
          padding: 50px;
          color: #000;
          font-family: 'Inter', sans-serif;
        }

        .report-card-header h2 {
          font-size: 2rem;
          color: #1e293b;
          border-bottom: 3px solid #000;
          display: inline-block;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }

        .employee-summary-strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border: 2px solid #000;
          margin-bottom: 30px;
        }

        .strip-item {
          padding: 12px;
          border-right: 1px solid #000;
          display: flex;
          flex-direction: column;
        }

        .strip-item:last-child {
          border-right: none;
        }

        .strip-item .label {
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          color: #334155;
          margin-bottom: 6px;
        }

        .strip-item .value {
          font-size: 1.1rem;
          font-weight: 500;
          color: #000;
          text-transform: uppercase;
        }

        .summary-table-wrapper {
          border: 2px solid #000;
        }

        .summary-table {
          width: 100%;
          border-collapse: collapse;
        }

        .summary-table th {
          background: #f1f5f9;
          border-bottom: 2px solid #000;
          padding: 12px 8px;
          font-size: 0.7rem;
          font-weight: 900;
          text-transform: uppercase;
          color: #000;
        }

        .summary-table th:last-child {
          border-right: none;
        }

        .summary-table td {
          border-bottom: 1px solid #000;
          padding: 12px 10px;
          font-size: 0.85rem;
          line-height: 1.4;
          vertical-align: top;
          word-break: break-word; /* Prevents long text from breaking the layout */
        }

        .summary-table td:last-child {
          border-right: none;
        }

        .summary-table tr:last-child td {
          border-bottom: none;
        }

        .date-cell {
          white-space: nowrap;
          font-weight: 700;
          font-size: 0.8rem !important;
        }

        .balance-cell-vl { background: #fff9db !important; font-weight: 900 !important; }
        .balance-cell-sl { background: #ebfbee !important; font-weight: 900 !important; }

        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          .no-print { display: none !important; }
          .sidebar { display: none !important; }
          .main-content { padding: 0 !important; margin: 0 !important; width: 100% !important; }
          .report-container { padding: 0 !important; width: 100% !important; box-shadow: none !important; }
          .summary-table th { background: #f1f5f9 !important; -webkit-print-color-adjust: exact; }
          .balance-cell-vl { background: #fff9db !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .balance-cell-sl { background: #ebfbee !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          
          /* Table text size adjustment for portrait */
          .summary-table td, .summary-table th {
             font-size: 0.65rem !important;
             padding: 8px 4px !important;
          }
        }

        /* Controls styling */
        .btn-export {
          background-color: #0f172a;
          color: white;
          padding: 12px 24px;
          border-radius: 6px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.2s;
        }

        .btn-export:hover:not(:disabled) {
          background-color: #334155;
          transform: translateY(-1px);
        }

        .search-results-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: white;
          border: 1px solid var(--border);
          border-radius: 8px;
          max-height: 250px;
          overflow-y: auto;
          z-index: 1000;
        }

        .search-result-item {
          padding: 10px 16px;
          cursor: pointer;
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.15s ease;
        }

        .search-result-item:hover {
          background: #f8fafc;
        }

        .search-result-item:last-child {
          border-bottom: none;
        }
      `}} />
    </div>
  );
};

export default LedgerSummary;
