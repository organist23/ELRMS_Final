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
        </div>
      </div>

      {/* The MAIN Leave Card (A4 Container) */}
      <div className="leave-card-print-container" ref={printRef}>
        <div className="report-header text-center mb-40">
          <h2 className="font-bold text-primary mb-4" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>Employee's Leave Card</h2>
        </div>

        {/* Employee Info Box */}
        <div className="report-info-grid mb-32">
          <div className="info-item">
            <span className="info-label">Name</span>
            <span className="info-value">{employee.full_name}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Civil Status</span>
            <span className="info-value">{employee.civil_status}</span>
          </div>
          <div className="info-item">
            <span className="info-label">GSIS Policy No.</span>
            <span className="info-value">{employee.gsis_policy || 'N/A'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Position</span>
            <span className="info-value">{employee.position}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Entrance of Duty</span>
            <span className="info-value">{new Date(employee.entrance_of_duty).toLocaleDateString()}</span>
          </div>
          <div className="info-item">
            <span className="info-label">TIN</span>
            <span className="info-value">{employee.tin || 'N/A'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Status</span>
            <span className="info-value">{employee.status}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Office</span>
            <span className="info-value">{employee.office}</span>
          </div>
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

                return (
                  <tr key={idx}>
                    <td className="text-center">{row.period_text || ''}</td>
                    <td className="text-small">{row.particulars || ''}</td>
                    <td className="text-center">{formatNum(row.vl?.earned)}</td>
                    <td className="text-center">{formatNum(row.vl?.deduct_w_pay)}</td>
                    <td className="text-center balance-cell">{formatNum(row.vl?.balance)}</td>
                    <td className="text-center">{formatNum(row.vl?.deduct_wo_pay)}</td>
                    <td className="text-center">{formatNum(row.sl?.earned)}</td>
                    <td className="text-center">{formatNum(row.sl?.deduct_w_pay)}</td>
                    <td className="text-center balance-cell">{formatNum(row.sl?.balance)}</td>
                    <td className="text-center">{formatNum(row.sl?.deduct_wo_pay)}</td>
                    <td className="text-small">{row.remarks || ''}</td>
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
          <p className="text-small text-muted font-bold" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>Special • Force • Wellness • Solo Parent</p>
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
          min-height: 1000px;
          color: #000;
        }

        .report-info-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border: 1.5px solid #000;
        }

        .info-item {
          padding: 8px 12px;
          border-right: 1.5px solid #000;
          border-bottom: 1.5px solid #000;
          display: flex;
          flex-direction: column;
        }

        .info-item:nth-child(4n) { border-right: none; }
        .info-item:nth-child(n+5) { border-bottom: none; }

        .info-label {
          font-size: 0.6rem;
          text-transform: uppercase;
          font-weight: 700;
          color: #666;
          margin-bottom: 2px;
        }

        .info-value {
          font-size: 0.85rem;
          font-weight: 700;
          color: #000;
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
          @page { size: A4 landscape; margin: 8mm; }
          body * { visibility: hidden; }
          .leave-card-print-container, .leave-card-print-container * {
            visibility: visible;
          }
          .leave-card-print-container {
            position: relative;
            padding: 0;
            margin-bottom: 40px;
            box-shadow: none;
            border: none;
            page-break-after: auto;
          }
          .no-print { display: none !important; }
        }
      `}} />
    </div>
  );
};

export default LeaveCardReport;
