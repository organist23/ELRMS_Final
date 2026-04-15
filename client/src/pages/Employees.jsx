import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Search, UserPlus, FilePlus, RefreshCw, Send, Trash2, Edit, Users, RefreshCw as RefreshIcon } from 'lucide-react';
import RegisterEmployeeModal from '../components/modals/RegisterEmployeeModal';
import EditEmployeeModal from '../components/modals/EditEmployeeModal';
import EncodeLeaveModal from '../components/modals/EncodeLeaveModal';
import RolloverModal from '../components/modals/RolloverModal';
import { useNotification } from '../context/NotificationContext';

const Employees = () => {
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
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>Employee Management</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage employee profiles and update leave credits.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={() => setIsRolloverModalOpen(true)} style={{ border: '1px solid var(--primary)', color: 'var(--primary)' }}>
            Yearly Rollover
          </button>
          <button className="btn-primary" onClick={() => setIsRegModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={18} />
            Register New
          </button>
        </div>
      </header>

      {/* Accrual Control Box */}
      <div className="premium-card" style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '24px', background: 'var(--primary-light)', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
           <Send size={20} color="var(--primary)" />
           <span style={{ fontWeight: '600', color: 'var(--primary)' }}>Generate Monthly Credits (1.25)</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input type="number" className="input-field" style={{ width: '80px', padding: '8px' }} value={accrualMonth} onChange={e => setAccrualMonth(e.target.value)} placeholder="Month" disabled={isGenerating} />
          <input type="number" className="input-field" style={{ width: '100px', padding: '8px' }} value={accrualYear} onChange={e => setAccrualYear(e.target.value)} placeholder="Year" disabled={isGenerating} />
          <button className="btn-primary" style={{ padding: '8px 16px', minWidth: '150px' }} onClick={handleGenerateCredits} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Confirm Generate'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px' }}>
        {/* Left Side: List */}
        <div className="premium-card">
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="input-field" 
                style={{ paddingLeft: '40px' }} 
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
                    style={{ cursor: 'pointer', background: selectedEmp?.id === emp.id ? 'var(--primary-light)' : '' }}
                  >
                    <td style={{ fontSize: '0.8125rem', fontWeight: '500' }}>{emp.id}</td>
                    <td style={{ fontWeight: '700' }}>{emp.full_name}</td>
                    <td style={{ fontSize: '0.875rem' }}>{emp.position}</td>
                    <td style={{ fontSize: '0.875rem' }}>{emp.office}</td>
                    <td><span className="badge badge-approved">{emp.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Details */}
        <div className="premium-card" style={{ height: 'fit-content', position: 'sticky', top: '40px' }}>
          {selectedEmp ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Employee Details</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                   <button className="icon-btn" style={{ color: 'var(--secondary)' }} onClick={() => setIsEditModalOpen(true)} title="Edit Profile">
                     <Edit size={18} />
                   </button>
                   <button className="icon-btn" style={{ color: 'var(--danger)' }} onClick={handleDeleteEmployee} title="Archive Employee">
                     <Trash2 size={18} />
                   </button>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '4px' }}>{selectedEmp.full_name}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{selectedEmp.id} • {selectedEmp.position}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
                 <div className="info-item">
                    <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Civil Status</label>
                    <span style={{ fontWeight: '700', fontSize: '1rem' }}>{selectedEmp.civil_status || 'N/A'}</span>
                 </div>
                 <div className="info-item">
                    <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>TIN</label>
                    <span style={{ fontWeight: '700', fontSize: '1rem' }}>{selectedEmp.tin || 'N/A'}</span>
                 </div>
                 <div className="info-item">
                    <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>GSIS Policy No.</label>
                    <span style={{ fontWeight: '700', fontSize: '1rem' }}>{selectedEmp.gsis_policy || 'N/A'}</span>
                 </div>
                 <div className="info-item">
                    <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Status</label>
                    <span className="badge badge-approved" style={{ fontSize: '0.75rem' }}>{selectedEmp.status}</span>
                 </div>
                 <div className="info-item">
                    <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Entrance of Duty</label>
                    <span style={{ fontWeight: '700', fontSize: '1rem' }}>{new Date(selectedEmp.entrance_of_duty).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}</span>
                 </div>
                 <div className="info-item">
                    <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Office</label>
                    <span style={{ fontWeight: '700', fontSize: '1rem' }}>{selectedEmp.office}</span>
                 </div>
              </div>

              <h4 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Leave Credits</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 {/* Vacation Leave Section */}
                 <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                       <span style={{ fontWeight: '600' }}>Vacation Leave (VL)</span>
                       <span style={{ fontWeight: '800', color: 'var(--primary)' }}>{parseFloat(selectedEmp.vacation_leave || 0).toFixed(3)}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                       <span>Forwarded: {parseFloat(selectedEmp.forwarded_vl || 0).toFixed(3)}</span>
                    </div>
                 </div>

                 {/* Sick Leave Section */}
                 <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                       <span style={{ fontWeight: '600' }}>Sick Leave (SL)</span>
                       <span style={{ fontWeight: '800', color: 'var(--primary)' }}>{parseFloat(selectedEmp.sick_leave || 0).toFixed(3)}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                       <span>Forwarded: {parseFloat(selectedEmp.forwarded_sl || 0).toFixed(3)}</span>
                    </div>
                 </div>

                 {/* Privilege Section */}
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '8px' }}>
                    <div style={{ padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.8125rem' }}>
                       <div style={{ color: 'var(--text-muted)', marginBottom: '4px', fontSize: '0.7rem' }}>SPECIAL</div>
                       <div style={{ fontWeight: '700' }}>{parseFloat(selectedEmp.special_leave || 0).toFixed(1)} / 3</div>
                    </div>
                    <div style={{ padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.8125rem' }}>
                       <div style={{ color: 'var(--text-muted)', marginBottom: '4px', fontSize: '0.7rem' }}>FORCE</div>
                       <div style={{ fontWeight: '700' }}>{parseFloat(selectedEmp.force_leave || 0).toFixed(1)} / 5</div>
                    </div>
                    <div style={{ padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.8125rem' }}>
                       <div style={{ color: 'var(--text-muted)', marginBottom: '4px', fontSize: '0.7rem' }}>WELLNESS</div>
                       <div style={{ fontWeight: '700' }}>{parseFloat(selectedEmp.wellness_leave || 0).toFixed(1)} / 5</div>
                    </div>
                    <div style={{ padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.8125rem' }}>
                       <div style={{ color: 'var(--text-muted)', marginBottom: '4px', fontSize: '0.7rem' }}>SOLO PARENT</div>
                       <div style={{ fontWeight: '700' }}>{parseFloat(selectedEmp.solo_parent_leave || 0).toFixed(1)} / 7</div>
                    </div>
                 </div>

                 {yearlyHistory.length > 0 && (
                   <div style={{ marginTop: '24px' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '12px', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RefreshCw size={14} />
                        Yearly Rollover History
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                         {yearlyHistory.map(hist => (
                           <div key={hist.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.8125rem' }}>
                              <span style={{ fontWeight: '600' }}>{hist.year} Rollover</span>
                              <span style={{ color: 'var(--text-muted)' }}>VL: {parseFloat(hist.vl_forwarded).toFixed(3)} | SL: {parseFloat(hist.sl_forwarded).toFixed(3)}</span>
                           </div>
                         ))}
                      </div>
                   </div>
                 )}
              </div>

              <button 
                className="btn-primary" 
                style={{ width: '100%', marginTop: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
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
      {isRolloverModalOpen && <RolloverModal onClose={() => setIsRolloverModalOpen(false)} onSuccess={fetchEmployees} />}
    </div>
  );
};

export default Employees;
;
