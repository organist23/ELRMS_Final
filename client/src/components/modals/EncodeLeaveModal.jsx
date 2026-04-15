import React, { useState } from 'react';
import api from '../../utils/api';
import { X, Calendar } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

const EncodeLeaveModal = ({ employee, onClose, onSuccess }) => {
  const { showToast } = useNotification();
  const [leaveData, setLeaveData] = useState({
    employee_id: employee.id,
    leave_type: 'Vacation Leave',
    date_from: '',
    date_to: '',
    inclusive_dates: '',
    num_days: 1,
    reason: ''
  });

  const earnedLeaves = ['Vacation Leave', 'Sick Leave'];
  const privilegeLeaves = ['Special Leave', 'Force Leave', 'Wellness Leave', 'Solo Parent Leave'];

  // Smart Parser for non-contiguous dates
  const parseInclusiveDates = (str) => {
    if (!str) return 0;
    // Regex to find single numbers and ranges (e.g. 5, 8-10, 27)
    const matches = str.match(/(\d+-\d+|\d+)/g);
    if (!matches) return 0;

    let total = 0;
    matches.forEach(match => {
      if (match.includes('-')) {
        const [start, end] = match.split('-').map(Number);
        if (start && end && end >= start) {
          total += (end - start) + 1;
        }
      } else {
        total += 1;
      }
    });
    return total;
  };

  const handleDateChange = (field, value) => {
    const newData = { ...leaveData, [field]: value };
    
    // 1. If date range changes, suggest inclusive dates
    if ((field === 'date_from' || field === 'date_to') && newData.date_from && newData.date_to) {
      const start = new Date(newData.date_from);
      const end = new Date(newData.date_to);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      // Update num_days based on range
      newData.num_days = diffDays;
      
      // Update string suggest
      const startMonth = start.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
      const endMonth = end.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
      
      if (startMonth === endMonth && start.getFullYear() === end.getFullYear()) {
        const startDay = start.getDate();
        const endDay = end.getDate();
        newData.inclusive_dates = startDay === endDay ? `${startMonth} ${startDay}` : `${startMonth} ${startDay}-${endDay}`;
      } else {
        const options = { month: 'short', day: 'numeric' };
        newData.inclusive_dates = `${start.toLocaleDateString('en-US', options).toUpperCase()} - ${end.toLocaleDateString('en-US', options).toUpperCase()}`;
      }
    }

    // 2. If Inclusive Dates string is manually edited, re-calculate num_days
    if (field === 'inclusive_dates') {
      const count = parseInclusiveDates(value);
      if (count > 0) newData.num_days = count;
    }

    setLeaveData(newData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/leaves/apply', leaveData);
      showToast('Leave application submitted for approval', 'success');
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to submit leave application', 'error');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Encode Leave Application</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>For: {employee.full_name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none' }}><X /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Type of Leave</label>
            <select 
              className="input-field" 
              value={leaveData.leave_type} 
              onChange={e => setLeaveData({...leaveData, leave_type: e.target.value})}
            >
              <optgroup label="Earned Credits">
                {earnedLeaves.map(l => <option key={l} value={l}>{l}</option>)}
              </optgroup>
              <optgroup label="Privilege Leaves">
                {privilegeLeaves.map(l => <option key={l} value={l}>{l}</option>)}
              </optgroup>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Date From</label>
              <input 
                type="date" 
                className="input-field" 
                value={leaveData.date_from} 
                onChange={e => handleDateChange('date_from', e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label>Date To</label>
              <input 
                type="date" 
                className="input-field" 
                value={leaveData.date_to} 
                onChange={e => handleDateChange('date_to', e.target.value)} 
              />
            </div>
          </div>

          <div className="form-group">
            <label>Inclusive Dates (e.g. SEPT 8, 27, 28-29)</label>
            <input 
              type="text" 
              className="input-field" 
              required 
              placeholder="SEPT 8, 27, 28-29"
              value={leaveData.inclusive_dates} 
              onChange={e => handleDateChange('inclusive_dates', e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label>Number of Days</label>
            <input 
              type="number" 
              step="0.5" 
              className="input-field" 
              required 
              value={leaveData.num_days} 
              onChange={e => setLeaveData({...leaveData, num_days: parseFloat(e.target.value)})} 
            />
          </div>

          <div className="form-group">
            <label>Reason / Details</label>
            <textarea 
              className="input-field" 
              style={{ minHeight: '100px', resize: 'vertical' }}
              value={leaveData.reason} 
              onChange={e => setLeaveData({...leaveData, reason: e.target.value})}
              placeholder="e.g. Illness, Vacation, etc."
            />
          </div>

          <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} />
              Submit Application
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EncodeLeaveModal;
