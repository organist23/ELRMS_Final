// src/components/EditEmployeeModal.jsx
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, User, Save, Trash2 } from 'lucide-react';

const EditEmployeeModal = ({ employee, onDelete, onClose }) => {
  const { updateEmployee } = useApp();
  const [formData, setFormData] = useState({
    ...employee
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateEmployee(formData);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content premium-card glass">
        <div className="modal-header">
          <div className="title-with-icon">
            <User size={24} className="text-primary" />
            <h2>Edit Employee Profile</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={24} /></button>
        </div>

        <div className="alert-info small mb-16">
          <p>The Employee ID (EID) is fixed and cannot be changed to maintain database integrity.</p>
        </div>

        <form onSubmit={handleSubmit} className="leave-form">
          <div className="form-row">
            <div className="form-group">
              <label>Employee ID (Locked)</label>
              <input 
                type="text" 
                disabled 
                className="input-disabled"
                value={formData.id}
              />
            </div>
            <div className="form-group">
              <label>Full Name</label>
              <input 
                type="text" 
                required 
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value.toUpperCase()})}
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
                onChange={(e) => setFormData({...formData, position: e.target.value.toUpperCase()})}
              />
            </div>
            <div className="form-group">
              <label>Office</label>
              <input 
                type="text" 
                required 
                value={formData.office}
                onChange={(e) => setFormData({...formData, office: e.target.value.toUpperCase()})}
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

          <div className="modal-footer split-footer">
            <button 
              type="button" 
              className="btn-danger-outline flex-btn"
              onClick={() => onDelete(employee)}
            >
              <Trash2 size={18} />
              <span>Delete Employee</span>
            </button>
            <div className="flex-group">
              <button type="button" className="btn-muted" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary flex-btn">
                <Save size={18} />
                <span>Update Profile</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEmployeeModal;
