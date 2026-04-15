import React, { useState } from 'react';
import api from '../../utils/api';
import { X, Save } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

const EditEmployeeModal = ({ employee, onClose, onSuccess }) => {
  const { showToast } = useNotification();
  const [formData, setFormData] = useState({
    full_name: employee.full_name,
    civil_status: employee.civil_status || 'SINGLE',
    gsis_policy: employee.gsis_policy || '',
    position: employee.position,
    entrance_of_duty: employee.entrance_of_duty ? new Date(employee.entrance_of_duty).toISOString().split('T')[0] : '',
    tin: employee.tin || '',
    status: employee.status || 'PERMANENT',
    office: employee.office || '',
    vacation_leave: employee.vacation_leave || 0,
    sick_leave: employee.sick_leave || 0
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/employees/${employee.id}`, formData);
      showToast('Employee credentials and balances updated', 'success');
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update employee', 'error');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '800px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Edit Employee Profile</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>ID: {employee.id}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none' }}><X /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" className="input-field" required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Position</label>
              <input type="text" className="input-field" required value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Office</label>
              <input type="text" className="input-field" required value={formData.office} onChange={e => setFormData({...formData, office: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Entrance of Duty</label>
              <input type="date" className="input-field" required value={formData.entrance_of_duty} onChange={e => setFormData({...formData, entrance_of_duty: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Civil Status</label>
              <select className="input-field" value={formData.civil_status} onChange={e => setFormData({...formData, civil_status: e.target.value})}>
                <option value="SINGLE">SINGLE</option>
                <option value="MARRIED">MARRIED</option>
                <option value="WIDOWED">WIDOWED</option>
                <option value="SEPARATED">SEPARATED</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select className="input-field" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="PERMANENT">PERMANENT</option>
                <option value="CASUAL">CASUAL</option>
                <option value="CONTRACTUAL">CONTRACTUAL</option>
              </select>
            </div>
            <div className="form-group">
              <label>GSIS Policy No.</label>
              <input type="text" className="input-field" value={formData.gsis_policy} onChange={e => setFormData({...formData, gsis_policy: e.target.value})} />
            </div>
            <div className="form-group">
              <label>TIN</label>
              <input type="text" className="input-field" value={formData.tin} onChange={e => setFormData({...formData, tin: e.target.value})} />
            </div>

            {/* Editable Balances */}
            <div style={{ gridColumn: 'span 2', background: 'var(--primary-light)', padding: '20px', borderRadius: '12px', marginTop: '10px' }}>
               <h4 style={{ marginBottom: '16px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 Manual Balance Adjustment (VL/SL Only)
               </h4>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label>Vacation Leave (VL)</label>
                    <input type="number" step="0.001" className="input-field" value={formData.vacation_leave} onChange={e => setFormData({...formData, vacation_leave: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Sick Leave (SL)</label>
                    <input type="number" step="0.001" className="input-field" value={formData.sick_leave} onChange={e => setFormData({...formData, sick_leave: e.target.value})} />
                  </div>
               </div>
               
               {/* Read Only Privilege Credits */}
               <h4 style={{ marginBottom: '16px', color: 'var(--secondary)', fontSize: '0.875rem' }}>View-Only: Privilege Credits (Annual Limits)</h4>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  <div style={{ background: 'white', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.75rem' }}>
                    <div style={{ color: 'var(--text-muted)' }}>SPECIAL</div>
                    <div style={{ fontWeight: '700' }}>{parseFloat(employee.special_leave).toFixed(1)}</div>
                  </div>
                  <div style={{ background: 'white', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.75rem' }}>
                    <div style={{ color: 'var(--text-muted)' }}>FORCE</div>
                    <div style={{ fontWeight: '700' }}>{parseFloat(employee.force_leave).toFixed(1)}</div>
                  </div>
                  <div style={{ background: 'white', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.75rem' }}>
                    <div style={{ color: 'var(--text-muted)' }}>WELLNESS</div>
                    <div style={{ fontWeight: '700' }}>{parseFloat(employee.wellness_leave).toFixed(1)}</div>
                  </div>
                  <div style={{ background: 'white', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.75rem' }}>
                    <div style={{ color: 'var(--text-muted)' }}>SOLO</div>
                    <div style={{ fontWeight: '700' }}>{parseFloat(employee.solo_parent_leave).toFixed(1)}</div>
                  </div>
               </div>
            </div>
          </div>

          <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ padding: '10px 24px' }}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ padding: '10px 32px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Save size={18} />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEmployeeModal;
