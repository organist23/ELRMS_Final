import React, { useState } from 'react';
import api from '../../utils/api';
import { X } from 'lucide-react';

const RegisterEmployeeModal = ({ onClose, onSuccess }) => {
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
      onSuccess();
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to register employee');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '800px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Register New Employee</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none' }}><X /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="form-group">
              <label>Employee ID (EID)</label>
              <input type="text" className="input-field" placeholder="EMP-2026-001" required value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" className="input-field" placeholder="LASTNAME, FIRSTNAME M." required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
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
              <label>GSIS Policy No.</label>
              <input type="text" className="input-field" placeholder="2001556677" value={formData.gsis_policy} onChange={e => setFormData({...formData, gsis_policy: e.target.value})} />
            </div>
            <div className="form-group">
              <label>TIN</label>
              <input type="text" className="input-field" placeholder="123-456-789" value={formData.tin} onChange={e => setFormData({...formData, tin: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select className="input-field" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="PERMANENT">PERMANENT</option>
                <option value="CASUAL">CASUAL</option>
                <option value="CONTRACTUAL">CONTRACTUAL</option>
              </select>
            </div>
            
            <div style={{ gridColumn: 'span 2', background: 'var(--primary-light)', padding: '20px', borderRadius: '12px', marginTop: '10px' }}>
               <h4 style={{ marginBottom: '16px', color: 'var(--primary)' }}>Initial Balances (Brought Forward)</h4>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="form-group">
                    <label>Initial Vacation Leave (VL)</label>
                    <input type="number" step="0.001" className="input-field" value={formData.initial_vl} onChange={e => setFormData({...formData, initial_vl: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Initial Sick Leave (SL)</label>
                    <input type="number" step="0.001" className="input-field" value={formData.initial_sl} onChange={e => setFormData({...formData, initial_sl: e.target.value})} />
                  </div>
               </div>
            </div>
          </div>

          <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ padding: '10px 24px' }}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ padding: '10px 32px' }}>Register Employee</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterEmployeeModal;
