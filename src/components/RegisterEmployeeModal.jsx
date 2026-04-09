// src/components/RegisterEmployeeModal.jsx
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, UserPlus } from 'lucide-react';

const RegisterEmployeeModal = ({ onClose }) => {
  const { addEmployee } = useApp();
  const [formData, setFormData] = useState({
    id: '',
    fullName: '',
    civilStatus: 'SINGLE',
    gsisPolicy: '',
    position: '',
    entranceOfDuty: '',
    tin: '',
    status: 'PERMANENT',
    office: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    addEmployee(formData);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content premium-card glass">
        <div className="modal-header">
          <div className="title-with-icon">
            <UserPlus size={24} className="text-primary" />
            <h2>Register New Employee</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="leave-form">
          <div className="form-row">
            <div className="form-group">
              <label>Employee ID (EID)</label>
              <input 
                type="text" 
                placeholder="e.g. EMP-2026-001" 
                required 
                value={formData.id}
                onChange={(e) => setFormData({...formData, id: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Full Name</label>
              <input 
                type="text" 
                placeholder="SURNAME, FIRST NAME M." 
                required 
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Position</label>
              <input 
                type="text" 
                required 
                value={formData.position}
                onChange={(e) => setFormData({...formData, position: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Office</label>
              <input 
                type="text" 
                required 
                value={formData.office}
                onChange={(e) => setFormData({...formData, office: e.target.value})}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Civil Status</label>
              <select 
                value={formData.civilStatus}
                onChange={(e) => setFormData({...formData, civilStatus: e.target.value})}
              >
                <option>SINGLE</option>
                <option>MARRIED</option>
                <option>WIDOWED</option>
                <option>SEPARATED</option>
              </select>
            </div>
            <div className="form-group">
              <label>Employment Status</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
              >
                <option>PERMANENT</option>
                <option>CASUAL</option>
                <option>CONTRACTUAL</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>GSIS Policy No.</label>
              <input 
                type="text" 
                value={formData.gsisPolicy}
                onChange={(e) => setFormData({...formData, gsisPolicy: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>TIN</label>
              <input 
                type="text" 
                value={formData.tin}
                onChange={(e) => setFormData({...formData, tin: e.target.value})}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Entrance of Duty</label>
            <input 
              type="date" 
              required 
              value={formData.entranceOfDuty}
              onChange={(e) => setFormData({...formData, entranceOfDuty: e.target.value})}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-muted" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Register Employee</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterEmployeeModal;
