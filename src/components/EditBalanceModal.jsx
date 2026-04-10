// src/components/EditBalanceModal.jsx
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Edit3 } from 'lucide-react';
import { formatCredits } from '../utils/leaveLogic';

const EditBalanceModal = ({ employee, onClose }) => {
  const { updateEmployeeBalances } = useApp();
  const [balances, setBalances] = useState({ ...employee.balances });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Only send what changed
    const changes = {};
    let hasChanges = false;

    Object.keys(balances).forEach(key => {
      const originalValue = parseFloat(employee.balances[key]);
      const newValue = parseFloat(balances[key]);
      
      if (originalValue !== newValue) {
        changes[key] = newValue;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      updateEmployeeBalances(employee.id, changes);
    }
    
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content premium-card glass">
        <div className="modal-header">
          <div className="title-with-icon">
            <Edit3 size={24} className="text-primary" />
            <h2>Update Leave Balances</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={24} /></button>
        </div>

        <p className="text-muted mb-24">
          Manual correction for <strong>{employee.fullName}</strong>. Every change will be logged.
        </p>

        <form onSubmit={handleSubmit} className="leave-form">
          <div className="form-row">
            <div className="form-group">
              <label>Vacation Leave</label>
              <input 
                type="number" step="0.001" required 
                value={balances.vacationLeave}
                onChange={(e) => setBalances({...balances, vacationLeave: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Sick Leave</label>
              <input 
                type="number" step="0.001" required 
                value={balances.sickLeave}
                onChange={(e) => setBalances({...balances, sickLeave: e.target.value})}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Special Leave</label>
              <input 
                type="number" step="0.001" required 
                value={balances.specialLeave}
                onChange={(e) => setBalances({...balances, specialLeave: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Force Leave</label>
              <input 
                type="number" step="0.001" required 
                value={balances.forceLeave}
                onChange={(e) => setBalances({...balances, forceLeave: e.target.value})}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Wellness Leave</label>
              <input 
                type="number" step="0.001" required 
                value={balances.wellnessLeave}
                onChange={(e) => setBalances({...balances, wellnessLeave: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Solo Parent Leave</label>
              <input 
                type="number" step="0.001" required 
                value={balances.soloParentLeave}
                onChange={(e) => setBalances({...balances, soloParentLeave: e.target.value})}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-muted" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Save Corrections</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditBalanceModal;
