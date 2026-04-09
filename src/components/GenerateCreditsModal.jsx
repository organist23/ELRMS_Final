// src/components/GenerateCreditsModal.jsx
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Zap, AlertCircle } from 'lucide-react';

const GenerateCreditsModal = ({ onClose }) => {
  const { generateMonthlyCredits } = useApp();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    try {
      generateMonthlyCredits(month, year);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content premium-card glass">
        <div className="modal-header">
          <div className="title-with-icon">
            <Zap size={24} className="text-warning" />
            <h2>Generate Monthly Credits</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={24} /></button>
        </div>

        <p className="text-muted mb-24">
          This will add <strong>1.25 credits</strong> to Vacation Leave (VL) and Sick Leave (SL) for all employees.
        </p>

        <form onSubmit={handleSubmit} className="leave-form">
          <div className="form-row">
            <div className="form-group">
              <label>Month (1-12)</label>
              <input 
                type="number" 
                min="1" 
                max="12" 
                required 
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Year</label>
              <input 
                type="number" 
                min="2000" 
                required 
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="error-box">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn-muted" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Confirm Generate</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GenerateCreditsModal;
