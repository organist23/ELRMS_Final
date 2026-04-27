import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Printer, ChevronLeft, Calendar, FileText, Download } from 'lucide-react';

const LeaveCardReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState([]);
  const printRef = useRef();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: reportData } = await api.get(`/employees/${id}/leave-card/${year}`);
      setData(reportData);
      
      // Also fetch archive to see available years
      const { data: history } = await api.get(`/employees/${id}/yearly-history`);
      const yearsSet = new Set([new Date().getFullYear()]);
      history.forEach(h => {
        yearsSet.add(h.year);
        yearsSet.add(h.year + 1);
      });
      setAvailableYears(Array.from(yearsSet).sort((a, b) => b - a));
      
    } catch (err) {
      console.error('Error fetching leave card', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, year]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="loading-state">Loading Leave Card...</div>;
  if (!data) return <div className="error-state">Error loading report data.</div>;

  const { employee, rows, startingBalance, privilegeRows } = data;

  return (
    <div className="fade-in">
      {/* Action Bar (Hidden on Print) */}
      <div className="no-print flex-between mb-32">
        <button className="btn-secondary flex items-center gap-10" onClick={() => navigate('/employees')}>
          <ChevronLeft size={18} /> Back to Employees
        </button>
        
        <div className="flex items-center gap-16">
          <div className="flex items-center gap-10 bg-white px-16 py-8 rounded-lg border border-slate-200 shadow-sm">
            <Calendar size={18} className="text-slate-400" />
            <select 
              className="font-bold bg-transparent outline-none cursor-pointer"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
            >
              {availableYears.map(y => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </div>

          <button className="btn-primary flex items-center gap-10" onClick={handlePrint}>
            <Printer size={18} /> Print Report
          </button>
        </div>
      </div>

      {/* The MAIN Leave Card (A4 Container) */}
      <div className="leave-card-print-container" ref={printRef}>
        <div className="report-header text-center mb-40">
          <h2 className="font-bold text-primary mb-4" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>Employee's Leave Card</h2>
        </div>

        {/* Employee Info Box - Official Layout (3 rows, 6 columns) */}
        <div className="report-info-grid mb-32">
          {/* Row 1 */}
          <div className="info-label-box">Name</div>
          <div className="info-value-box">{employee.full_name}</div>
          <div className="info-label-box">Civil Status</div>
          <div className="info-value-box">{employee.civil_status}</div>
          <div className="info-label-box">GSIS POLICY NO.</div>
          <div className="info-value-box">{employee.gsis_policy || 'N/A'}</div>

          {/* Row 2 */}
          <div className="info-label-box">Position</div>
          <div className="info-value-box">{employee.position}</div>
          <div className="info-label-box">Entrance of Duty</div>
          <div className="info-value-box">{new Date(employee.entrance_of_duty).toLocaleDateString()}</div>
          <div className="info-label-box">TIN</div>
          <div className="info-value-box">{employee.tin || 'N/A'}</div>

          {/* Row 3 */}
          <div className="info-label-box">Status</div>
          <div className="info-value-box">{employee.status}</div>
          <div className="info-label-box">Office</div>
          <div className="info-value-box">{employee.office}</div>
          <div className="info-label-box">EID</div>
          <div className="info-value-box">{employee.id}</div>
        </div>

        {/* The Card Table */}
        <div className="leave-card-table-wrapper">
          <table className="leave-card-table">
            <thead>
              <tr className="main-header">
                <th rowSpan="2" style={{ width: '12%' }}>Period</th>
                <th rowSpan="2" style={{ width: '20%' }}>Particular</th>
                <th colSpan="4" className="vacation-header">Vacation Leave</th>
                <th colSpan="4" className="sick-header">Sick Leave</th>
                <th rowSpan="2" style={{ width: '15%' }}>Remarks</th>
              </tr>
              <tr className="sub-header">
                <th>Earned</th>
                <th>Absence w/ Pay</th>
                <th className="balance-header">Balance</th>
                <th>LV w/o Pay</th>
                <th>Earned</th>
                <th>Absence w/ Pay</th>
                <th className="balance-header">Balance</th>
                <th>LV w/o Pay</th>
              </tr>
            </thead>
            <tbody>
              {/* Transaction Rows */}
              {rows && rows.map((row, idx) => {
                const formatNum = (num) => {
                  if (num === null || num === undefined || Number(num) === 0) return '';
                  return Number(num).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 });
                };

                const formatBalance = (num) => {
                  if (num === null || num === undefined) return '0.000';
                  return Number(num).toFixed(3);
                };

                const isSpecialRow = row.particulars?.includes('Monthly Credit') || row.particulars?.includes('UNDO APPROVAL');

                return (
                  <tr key={idx}>
                    <td className="text-center">{row.period_text || ''}</td>
                    <td className="text-small">{isSpecialRow ? '' : (row.particulars || '')}</td>
                    <td className="text-center">{formatNum(row.vl?.earned)}</td>
                    <td className="text-center">{formatNum(row.vl?.deduct_w_pay)}</td>
                    <td className="text-center balance-cell">{formatBalance(row.vl?.balance)}</td>
                    <td className="text-center">{formatNum(row.vl?.deduct_wo_pay)}</td>
                    <td className="text-center">{formatNum(row.sl?.earned)}</td>
                    <td className="text-center">{formatNum(row.sl?.deduct_w_pay)}</td>
                    <td className="text-center balance-cell">{formatBalance(row.sl?.balance)}</td>
                    <td className="text-center">{formatNum(row.sl?.deduct_wo_pay)}</td>
                    <td className="text-small">{isSpecialRow ? row.particulars : (row.remarks || '')}</td>
                  </tr>
                );
              })}
              
              {/* Fill remaining space for professional look if printed */}
              {[...Array(Math.max(0, 12 - rows.length))].map((_, i) => (
                <tr key={`empty-${i}`} className="empty-row">
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* The PRIVILEGE Leave Card (Second Card) */}
      <div className="leave-card-print-container" style={{ marginTop: '40px', minHeight: 'auto' }}>
        <div className="report-header text-center mb-32">
          <h2 className="font-bold text-primary mb-4" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>Privilege Leave Card</h2>
          <p className="text-small text-muted font-bold" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>Special • Force • Wellness • Solo Parent • Maternity • Mourning</p>
        </div>

        {/* Privilege Allocations Summary */}
        <div className="flex gap-16 mb-24">
            {/* Utility to clean numbers safely */}
            {(() => {
              const clean = (val) => {
                if (val === undefined || val === null) return '0';
                // Convert string "1.000" to number 1
                const num = Number(parseFloat(val));
                if (isNaN(num)) return '0';
                // Remove trailing zeros
                return parseFloat(num.toFixed(3)).toString();
              };
              // Debug log to catch any schema mismatches
              console.log('Report Data Check:', { 
                special: employee?.special_leave, 
                force: employee?.force_leave 
              });
             return (
               <>
                 <div className="privilege-summary-box">
                   <span className="label">Special</span>
                   <span className="value">{clean(employee?.special_leave)} / 3</span>
                 </div>
                 <div className="privilege-summary-box">
                   <span className="label">Force</span>
                   <span className="value">{clean(employee?.force_leave)} / 5</span>
                 </div>
                 <div className="privilege-summary-box">
                   <span className="label">Wellness</span>
                   <span className="value">{clean(employee?.wellness_leave)} / 5</span>
                 </div>
                 <div className="privilege-summary-box">
                   <span className="label">Solo Parent</span>
                   <span className="value">{clean(employee?.solo_parent_leave)} / 7</span>
                 </div>
                 <div className="privilege-summary-box">
                   <span className="label">Maternity</span>
                   <span className="value">{clean(employee?.maternity_leave)} / 105</span>
                 </div>
                 <div className="privilege-summary-box">
                   <span className="label">Mourning</span>
                   <span className="value">{clean(employee?.mourning_leave)} / 3</span>
                 </div>
               </>
             );
           })()}
        </div>

        <div className="leave-card-table-wrapper">
          <table className="leave-card-table">
            <thead>
              <tr className="main-header">
                <th style={{ width: '20%' }}>Period</th>
                <th style={{ width: '35%' }}>Particular</th>
                <th style={{ width: '20%' }}>Absence w/ Pay</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {privilegeRows && privilegeRows.length > 0 ? privilegeRows.map((row, idx) => (
                <tr key={idx}>
                  <td className="text-center">{row.period_text}</td>
                  <td className="font-bold" style={{ fontSize: '0.7rem' }}>{row.particulars}</td>
                  <td className="text-center font-bold" style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>{row.absence_w_pay}</td>
                  <td className="text-small">{row.remarks}</td>
                </tr>
              )) : (
                <tr className="empty-row">
                   <td colSpan="4" className="text-center text-muted" style={{ padding: '32px' }}>No privilege leave withdrawals recorded for this year.</td>
                </tr>
              )}
              
              {/* Visual fillers */}
              {[...Array(Math.max(0, 5 - (privilegeRows?.length || 0)))].map((_, i) => (
                <tr key={`empty-p-${i}`} className="empty-row">
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .leave-card-print-container {
          background: white;
          padding: 60px;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
          width: 100%;
          color: #000;
        }

        .report-info-grid {
          display: grid;
          grid-template-columns: 14% 23% 14% 23% 14% 12%;
          border-left: 1.5px solid #000;
          border-top: 1.5px solid #000;
          width: 100%;
          box-sizing: border-box;
        }

        .report-info-grid * {
          box-sizing: border-box;
        }

        .info-label-box {
          padding: 6px 8px;
          border-right: 1.5px solid #000;
          border-bottom: 1.5px solid #000;
          font-size: 0.6rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #333;
          background: #fafafa;
          display: flex;
          align-items: center;
          white-space: nowrap;
          overflow: hidden;
        }

        .info-value-box {
          padding: 6px 8px;
          border-right: 1.5px solid #000;
          border-bottom: 1.5px solid #000;
          font-size: 0.8rem;
          font-weight: 700;
          color: #000;
          display: flex;
          align-items: center;
          text-transform: uppercase;
          word-break: break-word;
          min-height: 32px;
        }

        .leave-card-table-wrapper {
          width: 100%;
          border: 1.5px solid #000;
        }

        .leave-card-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .leave-card-table th, .leave-card-table td {
          border: 1px solid #000;
          padding: 6px 4px;
          font-size: 0.75rem;
        }

        .main-header th {
          background: #fff;
          text-transform: uppercase;
          font-weight: 800;
          font-size: 0.7rem;
        }

        .sub-header th {
          font-size: 0.6rem;
          font-weight: 700;
          padding: 4px;
        }

        .vacation-header { color: #c2410c; }
        .sick-header { color: #15803d; }

        .leave-card-table th.balance-header {
          background: #fffbeb !important; /* amber-50 */
          border-left: 2px solid #000;
          border-right: 2px solid #000;
        }

        .balance-cell {
          background-color: #fffbeb !important; /* amber-50 */
          font-weight: 800;
          border-left: 1.5px solid #000 !important;
          border-right: 1.5px solid #000 !important;
        }

        .empty-row td {
          height: 30px;
        }

        .privilege-summary-box {
          flex: 1;
          background: #f8fafc;
          border: 1.5px solid #000;
          padding: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .privilege-summary-box .label {
          font-size: 0.55rem;
          font-weight: 800;
          text-transform: uppercase;
          color: #64748b;
          letter-spacing: 0.1em;
          margin-bottom: 2px;
        }

        .privilege-summary-box .value {
          font-size: 1rem;
          font-weight: 900;
          color: #000;
        }

        @media print {
          @page { 
            size: A4 landscape; 
            margin: 5mm; 
          }
          body { 
            background: none !important; 
            padding: 0 !important;
            margin: 0 !important;
          }
          /* Completely hide other dashboard elements like Sidebar/Navbar */
          nav, aside, .sidebar, .navbar, .no-print { 
            display: none !important; 
          }
          
          .fade-in { padding: 0 !important; margin: 0 !important; }
          
          .leave-card-print-container {
            width: 287mm !important; /* Maximized width for landscape */
            margin: 0 auto !important;
            padding: 10px !important;
            box-shadow: none !important;
            border: 1px solid #eee !important;
            border-radius: 0 !important;
            display: block !important;
          }
          
          /* Prevent any accidental blank pages between the two cards */
          .leave-card-print-container + .leave-card-print-container {
            margin-top: 10mm !important;
            page-break-before: always;
          }

          body * { visibility: hidden; }
          .leave-card-print-container, .leave-card-print-container * {
            visibility: visible !important;
          }
        }
      `}} />
    </div>
  );
};

export default LeaveCardReport;
