import React, { useState } from 'react';
import api from '../../utils/api';
import { X } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

const RegisterEmployeeModal = ({ onClose, onSuccess }) => {
  const { showToast } = useNotification();
  const [formData, setFormData] = useState({
    id: '',
    full_name: '',
    civil_status: 'SINGLE',
    gsis_policy: '',
    position: '',
    entrance_of_duty: '',
    tin: '',
    status: 'PERMANENT',
    office: '',
    initial_vl: 0,
    initial_sl: 0
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/employees', formData);
      showToast('Employee registered successfully', 'success');
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to register employee', 'error');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content fade-in" style={{ maxWidth: '800px' }}>
        <div className="flex-between mb-32">
          <h2 className="font-bold" style={{ fontSize: '1.5rem' }}>Register New Employee</h2>
          <button onClick={onClose} className="icon-btn"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="form-group">
              <label>Employee ID (EID)</label>
              <input type="text" className="input-field" placeholder="EMP-2026-001" required value={formData.id} onChange={e => setFormData({ ...formData, id: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Full Name</label>
              <input type="text" className="input-field" placeholder="LASTNAME, FIRSTNAME M." required value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Position</label>
              <input type="text" className="input-field" required value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Office</label>
              <input type="text" className="input-field" required value={formData.office} onChange={e => setFormData({ ...formData, office: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Entrance of Duty</label>
              <input type="date" className="input-field" required value={formData.entrance_of_duty} onChange={e => setFormData({ ...formData, entrance_of_duty: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Civil Status</label>
              <select className="input-field" value={formData.civil_status} onChange={e => setFormData({ ...formData, civil_status: e.target.value })}>
                <option value="SINGLE">SINGLE</option>
                <option value="MARRIED">MARRIED</option>
                <option value="WIDOWED">WIDOWED</option>
                <option value="SEPARATED">SEPARATED</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">GSIS Policy No.</label>
              <input type="text" className="input-field" placeholder="2001556677" value={formData.gsis_policy} onChange={e => setFormData({ ...formData, gsis_policy: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">TIN</label>
              <input type="text" className="input-field" placeholder="123-456-789" value={formData.tin} onChange={e => setFormData({ ...formData, tin: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Status</label>
              <select className="input-field" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                <option value="PERMANENT">PERMANENT</option>
                <option value="CASUAL">SUBSTITUTE</option>
                <option value="CONTRACTUAL">ELECTIVE</option>
                <option value="CONTRACTUAL">SB</option>
                <option value="CONTRACTUAL">MAYOR</option>
                <option value="CONTRACTUAL">VICE MAYOR</option>
                <option value="CONTRACTUAL">CASUAL</option>
                <option value="CONTRACTUAL">CO TERMINUS</option>
              </select>
            </div>

            <div style={{ gridColumn: 'span 2', background: 'var(--accent-light)', padding: '24px', borderRadius: 'var(--radius)', marginTop: '8px', border: '1px solid var(--accent)' }}>
              <h4 className="font-bold mb-16" style={{ color: 'var(--accent)', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em' }}>Initial Balances (Brought Forward)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label>Initial Vacation Leave (VL)</label>
                  <input type="number" step="0.001" className="input-field" value={formData.initial_vl} onChange={e => setFormData({ ...formData, initial_vl: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Initial Sick Leave (SL)</label>
                  <input type="number" step="0.001" className="input-field" value={formData.initial_sl} onChange={e => setFormData({ ...formData, initial_sl: e.target.value })} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex-between" style={{ marginTop: '40px', gap: '16px' }}>
            <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ flex: 1.5 }}>Register Employee</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterEmployeeModal;
