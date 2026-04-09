// src/components/EncodeLeaveModal.jsx
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Calendar, AlertCircle } from 'lucide-react';
import { PRIVILEGE_LIMITS } from '../utils/leaveLogic';

const EncodeLeaveModal = ({ employee, onClose }) => {
  const { addApplication } = useApp();
  const [formData, setFormData] = useState({
    type: 'Vacation Leave',
    dateFrom: '',
    dateTo: '',
    numDays: '',
    reason: ''
  });
  const [error, setError] = useState('');

  const calculateDays = (from, to) => {
    if (!from || !to) return '';
    const start = new Date(from);
    const end = new Date(to);
    const diffTime = end - start;
    if (diffTime < 0) return 0;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleDateChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    const days = calculateDays(newFormData.dateFrom, newFormData.dateTo);
    setFormData({ ...newFormData, numDays: days });
  };

  const leaveTypes = [
    { name: 'Vacation Leave', category: 'Earned' },
    { name: 'Sick Leave', category: 'Earned' },
    { name: 'Special Leave', category: 'Privilege', limit: PRIVILEGE_LIMITS.specialLeave },
    { name: 'Force Leave', category: 'Privilege', limit: PRIVILEGE_LIMITS.forceLeave },
    { name: 'Wellness Leave', category: 'Privilege', limit: PRIVILEGE_LIMITS.wellnessLeave },
    { name: 'Solo Parent Leave', category: 'Privilege', limit: PRIVILEGE_LIMITS.soloParentLeave },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const typeMap = {
      'Vacation Leave': 'vacationLeave',
      'Sick Leave': 'sickLeave',
      'Special Leave': 'specialLeave',
      'Force Leave': 'forceLeave',
      'Wellness Leave': 'wellnessLeave',
      'Solo Parent Leave': 'soloParentLeave'
    };
    
    const balanceKey = typeMap[formData.type];
    const currentBalance = employee.balances[balanceKey] || 0;
    const selectedType = leaveTypes.find(t => t.name === formData.type);
    const numDays = parseFloat(formData.numDays);

    if (new Date(formData.dateTo) < new Date(formData.dateFrom)) {
      setError('Invalid Date Range: Date To cannot be before Date From.');
      return;
    }

    if (numDays <= 0) {
      setError('Invalid Duration: Number of days must be at least 1.');
      return;
    }

    if (selectedType.category === 'Privilege') {
      if (numDays > currentBalance) {
        setError(`Insufficient Privileges: You only have ${currentBalance.toFixed(3)} days of ${formData.type} left for this year.`);
        return;
      }
    }

    addApplication({
      employeeId: employee.id,
      employeeName: employee.fullName,
      ...formData,
      numDays
    });
    
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content premium-card glass">
        <div className="modal-header">
          <h2>Encode Leave Application</h2>
          <button className="icon-btn" onClick={onClose}><X size={24} /></button>
        </div>

        <div className="employee-strip">
          <p>Applying for: <strong>{employee.fullName}</strong> ({employee.id})</p>
        </div>

        <form onSubmit={handleSubmit} className="leave-form">
          <div className="form-group">
            <label>Leave Type</label>
            <select 
              value={formData.type} 
              onChange={(e) => setFormData({...formData, type: e.target.value})}
            >
              <optgroup label="Earned Leave (Gains 1.25/mo)">
                <option>Vacation Leave</option>
                <option>Sick Leave</option>
              </optgroup>
              <optgroup label="Privilege Leave (Fixed Limits)">
                <option>Special Leave</option>
                <option>Force Leave</option>
                <option>Wellness Leave</option>
                <option>Solo Parent Leave</option>
              </optgroup>
            </select>
            <p className="text-muted small mt-2">
              Available Balance: <span className="text-primary font-bold">
                {employee.balances[{
                  'Vacation Leave': 'vacationLeave',
                  'Sick Leave': 'sickLeave',
                  'Special Leave': 'specialLeave',
                  'Force Leave': 'forceLeave',
                  'Wellness Leave': 'wellnessLeave',
                  'Solo Parent Leave': 'soloParentLeave'
                }[formData.type]].toFixed(3)} days
              </span>
            </p>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Date From</label>
              <input 
                type="date" 
                required 
                value={formData.dateFrom}
                onChange={(e) => handleDateChange('dateFrom', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Date To</label>
              <input 
                type="date" 
                required 
                value={formData.dateTo}
                onChange={(e) => handleDateChange('dateTo', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Number of Days</label>
            <input 
              type="number" 
              step="0.5" 
              required 
              placeholder="e.g. 2.0"
              value={formData.numDays}
              onChange={(e) => setFormData({...formData, numDays: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Details / Reason</label>
            <textarea 
              rows="3" 
              placeholder="Reason for leave (e.g. Personal, Illness, Destination)"
              value={formData.reason}
              onChange={(e) => setFormData({...formData, reason: e.target.value})}
            ></textarea>
          </div>

          {error && (
            <div className="error-box">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn-muted" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Submit Application</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EncodeLeaveModal;
