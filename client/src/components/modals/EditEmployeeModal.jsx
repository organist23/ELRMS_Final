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
      <div className="modal-content fade-in" style={{ maxWidth: '800px' }}>
        <div className="flex-between mb-32">
          <div>
            <h2 className="font-bold mb-4" style={{ fontSize: '1.5rem' }}>Edit Employee Profile</h2>
            <p className="text-small text-muted font-bold">ID: {employee.id}</p>
          </div>
          <button onClick={onClose} className="icon-btn"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="form-group">
              <label className="label">Full Name</label>
              <input type="text" className="input-field" required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="label">Position</label>
              <input type="text" className="input-field" required value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="label">Office</label>
              <input type="text" className="input-field" required value={formData.office} onChange={e => setFormData({...formData, office: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="label">Entrance of Duty</label>
              <input type="date" className="input-field" required value={formData.entrance_of_duty} onChange={e => setFormData({...formData, entrance_of_duty: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="label">Civil Status</label>
              <select className="input-field" value={formData.civil_status} onChange={e => setFormData({...formData, civil_status: e.target.value})}>
                <option value="SINGLE">SINGLE</option>
                <option value="MARRIED">MARRIED</option>
                <option value="WIDOWED">WIDOWED</option>
                <option value="SEPARATED">SEPARATED</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Status</label>
              <select className="input-field" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="PERMANENT">PERMANENT</option>
                <option value="CASUAL">CASUAL</option>
                <option value="CONTRACTUAL">CONTRACTUAL</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">GSIS Policy No.</label>
              <input type="text" className="input-field" value={formData.gsis_policy} onChange={e => setFormData({...formData, gsis_policy: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="label">TIN</label>
              <input type="text" className="input-field" value={formData.tin} onChange={e => setFormData({...formData, tin: e.target.value})} />
            </div>

            {/* Editable Balances */}
            {/* Editable Balances */}
            <div style={{ gridColumn: 'span 2', background: 'var(--accent-light)', padding: '24px', borderRadius: 'var(--radius)', marginTop: '8px', border: '1px solid var(--accent)' }}>
               <h4 className="font-bold mb-16" style={{ color: 'var(--accent)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                 Manual Balance Adjustment (VL/SL Only)
               </h4>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                  <div className="form-group">
                    <label className="label">Vacation Leave (VL)</label>
                    <input type="number" step="0.001" className="input-field" value={formData.vacation_leave} onChange={e => setFormData({...formData, vacation_leave: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="label">Sick Leave (SL)</label>
                    <input type="number" step="0.001" className="input-field" value={formData.sick_leave} onChange={e => setFormData({...formData, sick_leave: e.target.value})} />
                  </div>
               </div>
               
               {/* Read Only Privilege Credits */}
               <h4 className="font-bold mb-12 text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.8 }}>View-Only: Privilege Credits (Annual Limits)</h4>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div className="label mb-4" style={{ fontSize: '0.6rem' }}>SPECIAL</div>
                    <div className="font-bold">{Number(employee.special_leave)}</div>
                  </div>
                  <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div className="label mb-4" style={{ fontSize: '0.6rem' }}>FORCE</div>
                    <div className="font-bold">{Number(employee.force_leave)}</div>
                  </div>
                  <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div className="label mb-4" style={{ fontSize: '0.6rem' }}>WELLNESS</div>
                    <div className="font-bold">{Number(employee.wellness_leave)}</div>
                  </div>
                  <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div className="label mb-4" style={{ fontSize: '0.6rem' }}>SOLO</div>
                    <div className="font-bold">{Number(employee.solo_parent_leave)}</div>
                  </div>
               </div>
            </div>
          </div>

          <div className="flex-between" style={{ marginTop: '40px', gap: '16px' }}>
            <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ flex: 1.5 }}>
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
