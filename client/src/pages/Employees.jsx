import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Search, UserPlus, FilePlus, RefreshCw, Send, Trash2, Edit, Users, FileText, RefreshCw as RefreshIcon } from 'lucide-react';
import RegisterEmployeeModal from '../components/modals/RegisterEmployeeModal';
import EditEmployeeModal from '../components/modals/EditEmployeeModal';
import EncodeLeaveModal from '../components/modals/EncodeLeaveModal';
import RolloverModal from '../components/modals/RolloverModal';
import { useNotification } from '../context/NotificationContext';

const Employees = () => {
  const navigate = useNavigate();
  const { showToast, confirm } = useNotification();
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isRolloverModalOpen, setIsRolloverModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [yearlyHistory, setYearlyHistory] = useState([]);

  // Accrual State
  const [accrualMonth, setAccrualMonth] = useState(new Date().getMonth() + 1);
  const [accrualYear, setAccrualYear] = useState(new Date().getFullYear());
  const [audit, setAudit] = useState(null);

  const fetchAudit = async () => {
    try {
      const { data } = await api.get('/system/audit');
      setAudit(data);
    } catch (err) {
      console.error('Audit failed', err);
    }
  };

  const handleMonthChange = (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) setAccrualMonth(Math.min(12, Math.max(1, val)));
  };

  const handleYearChange = (e) => {
    const val = parseInt(e.target.value);
    const currentYear = new Date().getFullYear();
    if (!isNaN(val)) setAccrualYear(Math.min(currentYear + 5, Math.max(2000, val)));
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await api.get('/employees');
      setEmployees(data);
      if (selectedEmp) {
        const updated = data.find(e => e.id === selectedEmp.id);
        if (updated) setSelectedEmp(updated);
      }
    } catch (err) {
      console.error('Error fetching employees', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchYearlyHistory = async (empId) => {
    try {
      const { data } = await api.get(`/employees/${empId}/yearly-history`);
      setYearlyHistory(data);
    } catch (err) {
      console.error('Error fetching yearly history', err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchAudit();
  }, []);

  useEffect(() => {
    if (selectedEmp) {
      fetchYearlyHistory(selectedEmp.id);
    }
  }, [selectedEmp?.id]);

  const handleGenerateCredits = async () => {
    const isConfirmed = await confirm(
      'Generate Credits',
      `Are you sure you want to generate 1.25 VL/SL credits for all employees for ${accrualMonth}/${accrualYear}?`
    );
    if (!isConfirmed) return;
    
    setIsGenerating(true);
    try {
      const { data } = await api.post('/accrual/generate', { month: accrualMonth, year: accrualYear });
      showToast(data.message, 'success');
      fetchEmployees();
      fetchAudit();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to generate credits', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Privilege Reset is now combined with Yearly Rollover.
  // Individual adjustments can be made via the Edit Profile modal.

  const handleDeleteEmployee = async () => {
    if (!selectedEmp) return;
    
    const isConfirmed = await confirm(
      'Archive Employee',
      `Are you sure you want to delete ${selectedEmp.full_name}? Their records will be moved to the inactive archive for audit history.`
    );
    
    if (!isConfirmed) return;

    try {
      await api.delete(`/employees/${selectedEmp.id}`);
      showToast('Employee archived and history preserved.', 'success');
      setSelectedEmp(null);
      fetchEmployees();
    } catch (err) {
      showToast('Failed to archive employee', 'error');
    }
  };

  const filtered = employees.filter(e => 
    e.full_name.toLowerCase().includes(search.toLowerCase()) || 
    e.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-in">
      <header className="flex-between mb-32">
        <div>
          <h1 className="font-bold mb-8" style={{ fontSize: '2.25rem' }}>Employee Management</h1>
          <p className="text-muted">Manage employee profiles and update leave credits.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button className="btn-secondary" onClick={() => setIsRolloverModalOpen(true)}>
            Yearly Rollover
          </button>
          <button className="btn-primary" onClick={() => setIsRegModalOpen(true)}>
            <UserPlus size={18} />
            Register New
          </button>
        </div>
      </header>

      {/* Accrual Control Box */}
      <div className="premium-card mb-40" style={{ background: 'var(--accent-light)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
        {/* Label */}
        <div className="flex items-center gap-14" style={{ flexShrink: 0 }}>
          <Send size={20} color="var(--accent)" />
          <span className="font-bold" style={{ color: 'var(--accent)', fontSize: '1rem', whiteSpace: 'nowrap' }}>Generate Monthly Credits (1.25)</span>
        </div>

        {/* Inputs + Button */}
        <div className="flex items-center gap-12" style={{ flexShrink: 0 }}>

          {/* Month Input */}
          <div className="flex flex-col" style={{ gap: '4px' }}>
            <span className="text-small font-bold" style={{ color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>Month</span>
            <input
              type="number"
              className="input-field"
              style={{ width: '72px', fontWeight: 700, textAlign: 'center', border: '1.5px solid var(--accent)', color: 'var(--accent)' }}
              value={accrualMonth}
              min={1}
              max={12}
              step={1}
              onChange={handleMonthChange}
              onBlur={handleMonthChange}
              disabled={isGenerating}
            />
          </div>

          <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '1.1rem', paddingTop: '18px' }}>/</span>

          {/* Year Input */}
          <div className="flex flex-col" style={{ gap: '4px' }}>
            <span className="text-small font-bold" style={{ color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>Year</span>
            <input
              type="number"
              className="input-field"
              style={{ width: '96px', fontWeight: 700, textAlign: 'center', border: '1.5px solid var(--accent)', color: 'var(--accent)' }}
              value={accrualYear}
              min={2000}
              max={new Date().getFullYear() + 5}
              step={1}
              onChange={handleYearChange}
              onBlur={handleYearChange}
              disabled={isGenerating}
            />
          </div>

          <button 
            className="btn-primary" 
            style={{ 
              height: '44px', 
              padding: '0 28px', 
              whiteSpace: 'nowrap', 
              alignSelf: 'flex-end',
              opacity: (isGenerating || audit?.pendingRollover) ? 0.5 : 1,
              cursor: (isGenerating || audit?.pendingRollover) ? 'not-allowed' : 'pointer'
            }} 
            onClick={handleGenerateCredits} 
            disabled={isGenerating || audit?.pendingRollover}
          >
            {audit?.pendingRollover ? 'Rollover Required First' : (isGenerating ? 'Generating...' : 'Confirm Generate')}
          </button>
        </div>
      </div>


      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px' }}>
        {/* Left Side: List */}
        <div className="premium-card">
          <div className="form-group mb-24">
            <div style={{ position: 'relative' }}>
              <Search size={18} className="search-icon" />
              <input 
                type="text" 
                className="input-field" 
                style={{ paddingLeft: '44px' }} 
                placeholder="Search by ID or Name..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>EID</th>
                  <th>Full Name</th>
                  <th>Position</th>
                  <th>Office</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => (
                  <tr 
                    key={emp.id} 
                    onClick={() => setSelectedEmp(emp)}
                    className="clickable-row"
                    style={{ background: selectedEmp?.id === emp.id ? 'var(--primary-light)' : '' }}
                  >
                    <td className="font-bold text-small" style={{ color: 'var(--secondary)' }}>{emp.id}</td>
                    <td className="font-bold" style={{ fontSize: '0.9375rem' }}>{emp.full_name}</td>
                    <td className="text-small">{emp.position}</td>
                    <td className="text-small">{emp.office}</td>
                    <td><span className="badge badge-approved">{emp.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Details */}
        <div className="premium-card" style={{ height: 'fit-content', position: 'sticky', top: '40px', padding: '32px' }}>
          {selectedEmp ? (
            <div>
              <div className="flex-between mb-24">
                <h3 className="font-bold" style={{ fontSize: '1.25rem' }}>Employee Details</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                   <button className="icon-btn" onClick={() => navigate(`/employees/${selectedEmp.id}/leave-card`)} title="View Leave Card Report" style={{ color: 'var(--accent)' }}>
                     <FileText size={18} />
                   </button>
                   <button className="icon-btn" onClick={() => setIsEditModalOpen(true)} title="Edit Profile">
                     <Edit size={18} />
                   </button>
                   <button className="icon-btn" style={{ color: '#ef4444' }} onClick={handleDeleteEmployee} title="Archive Employee">
                     <Trash2 size={18} />
                   </button>
                </div>
              </div>

              <div className="mb-24">
                <p className="font-bold" style={{ fontSize: '1.4rem', lineHeight: '1.1', marginBottom: '4px' }}>{selectedEmp.full_name}</p>
                <p className="text-muted text-small font-bold" style={{ letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.7rem' }}>{selectedEmp.id} • {selectedEmp.position}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 12px', marginBottom: '32px' }}>
                 <div className="info-item">
                    <label className="label" style={{ fontSize: '0.6rem', opacity: 0.7 }}>Civil Status</label>
                    <span className="font-bold" style={{ fontSize: '0.85rem' }}>{selectedEmp.civil_status || 'N/A'}</span>
                 </div>
                 <div className="info-item">
                    <label className="label" style={{ fontSize: '0.6rem', opacity: 0.7 }}>TIN</label>
                    <span className="font-bold" style={{ fontSize: '0.85rem' }}>{selectedEmp.tin || 'N/A'}</span>
                 </div>
                 <div className="info-item">
                    <label className="label" style={{ fontSize: '0.6rem', opacity: 0.7 }}>GSIS Policy</label>
                    <span className="font-bold" style={{ fontSize: '0.85rem' }}>{selectedEmp.gsis_policy || 'N/A'}</span>
                 </div>
                 <div className="info-item">
                    <label className="label" style={{ fontSize: '0.6rem', opacity: 0.7 }}>Status</label>
                    <span className="badge badge-approved" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>{selectedEmp.status}</span>
                 </div>
                 <div className="info-item">
                    <label className="label" style={{ fontSize: '0.6rem', opacity: 0.7 }}>Entrance of Duty</label>
                    <span className="font-bold" style={{ fontSize: '0.85rem' }}>{new Date(selectedEmp.entrance_of_duty).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                 </div>
                 <div className="info-item">
                    <label className="label" style={{ fontSize: '0.6rem', opacity: 0.7 }}>Office</label>
                    <span className="font-bold" style={{ fontSize: '0.85rem' }}>{selectedEmp.office}</span>
                 </div>
              </div>

              <h4 className="font-bold mb-12" style={{ fontSize: '0.75rem', color: 'var(--secondary)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.8 }}>Leave Credits</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                 <div style={{ background: 'var(--primary-light)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <div className="flex-between mb-4">
                       <span className="font-bold" style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>Vacation Leave (VL)</span>
                       <span className="font-bold" style={{ fontSize: '1.15rem', color: 'var(--primary)' }}>{parseFloat(selectedEmp.vacation_leave || 0).toFixed(3)}</span>
                    </div>
                    <div className="flex-between text-small text-muted font-bold" style={{ fontSize: '0.7rem' }}>
                       <span style={{ opacity: 0.7 }}>Forwarded: {parseFloat(selectedEmp.forwarded_vl || 0).toFixed(3)}</span>
                    </div>
                 </div>

                 <div style={{ background: 'var(--primary-light)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <div className="flex-between mb-4">
                       <span className="font-bold" style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>Sick Leave (SL)</span>
                       <span className="font-bold" style={{ fontSize: '1.15rem', color: 'var(--primary)' }}>{parseFloat(selectedEmp.sick_leave || 0).toFixed(3)}</span>
                    </div>
                    <div className="flex-between text-small text-muted font-bold" style={{ fontSize: '0.7rem' }}>
                       <span style={{ opacity: 0.7 }}>Forwarded: {parseFloat(selectedEmp.forwarded_sl || 0).toFixed(3)}</span>
                    </div>
                 </div>

                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                       <div className="label mb-4" style={{ fontSize: '0.55rem', opacity: 0.7 }}>SPECIAL</div>
                       <div className="font-bold" style={{ fontSize: '0.9rem' }}>{Number(selectedEmp.special_leave || 0)} / 3</div>
                    </div>
                    <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                       <div className="label mb-4" style={{ fontSize: '0.55rem', opacity: 0.7 }}>FORCE</div>
                       <div className="font-bold" style={{ fontSize: '0.9rem' }}>{Number(selectedEmp.force_leave || 0)} / 5</div>
                    </div>
                    <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                       <div className="label mb-4" style={{ fontSize: '0.55rem', opacity: 0.7 }}>WELLNESS</div>
                       <div className="font-bold" style={{ fontSize: '0.9rem' }}>{Number(selectedEmp.wellness_leave || 0)} / 5</div>
                    </div>
                    <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                       <div className="label mb-4" style={{ fontSize: '0.55rem', opacity: 0.7 }}>SOLO PARENT</div>
                       <div className="font-bold" style={{ fontSize: '0.9rem' }}>{Number(selectedEmp.solo_parent_leave || 0)} / 7</div>
                    </div>
                    <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                       <div className="label mb-4" style={{ fontSize: '0.55rem', opacity: 0.7 }}>MATERNITY</div>
                       <div className="font-bold" style={{ fontSize: '0.9rem' }}>{Number(selectedEmp.maternity_leave || 0)} / 105</div>
                    </div>
                    <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                       <div className="label mb-4" style={{ fontSize: '0.55rem', opacity: 0.7 }}>MOURNING</div>
                       <div className="font-bold" style={{ fontSize: '0.9rem' }}>{Number(selectedEmp.mourning_leave || 0)} / 3</div>
                    </div>
                 </div>

                 {yearlyHistory.length > 0 && (
                    <div style={{ marginTop: '32px' }}>
                       <h4 className="font-bold mb-16" style={{ fontSize: '0.8125rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase' }}>
                         <RefreshCw size={14} />
                         Rollover History
                       </h4>
                       <div className="flex flex-col gap-10" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                          {yearlyHistory.map(hist => (
                            <div key={hist.id} className="flex-between" style={{ padding: '10px 14px', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                               <span className="font-bold text-small">{hist.year}</span>
                               <span className="text-small text-muted font-bold">VL: {parseFloat(hist.vl_forwarded).toFixed(3)} | SL: {parseFloat(hist.sl_forwarded).toFixed(3)}</span>
                            </div>
                          ))}
                       </div>
                    </div>
                  )}
              </div>

              <button 
                className="btn-primary w-full" 
                style={{ marginTop: '24px' }}
                onClick={() => setIsLeaveModalOpen(true)}
              >
                <FilePlus size={18} />
                Encode Leave Application
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <Users size={48} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.2 }} />
              <p>Select an employee from the list to view credits and details.</p>
            </div>
          )}
        </div>
      </div>

      {isRegModalOpen && <RegisterEmployeeModal onClose={() => setIsRegModalOpen(false)} onSuccess={fetchEmployees} />}
      {isEditModalOpen && selectedEmp && <EditEmployeeModal employee={selectedEmp} onClose={() => setIsEditModalOpen(false)} onSuccess={fetchEmployees} />}
      {isLeaveModalOpen && selectedEmp && <EncodeLeaveModal employee={selectedEmp} onClose={() => setIsLeaveModalOpen(false)} onSuccess={fetchEmployees} />}
      {isRolloverModalOpen && <RolloverModal onClose={() => setIsRolloverModalOpen(false)} onSuccess={() => { fetchEmployees(); fetchAudit(); }} />}
    </div>
  );
};

export default Employees;
;
