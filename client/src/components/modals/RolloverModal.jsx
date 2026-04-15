import React, { useState } from 'react';
import api from '../../utils/api';
import { X, Calendar, AlertTriangle } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

const RolloverModal = ({ onClose, onSuccess }) => {
  const { showToast, confirm } = useNotification();
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!year) return;

    const isConfirmed = await confirm(
      'Confirm Yearly Rollover',
      `Are you sure you want to perform the yearly rollover for ${year}? This will forward all current balances to ${parseInt(year) + 1}. This action cannot be undone.`
    );

    if (!isConfirmed) return;

    setLoading(true);
    try {
      await api.post('/accrual/rollover', { 
        from_year: year, 
        to_year: parseInt(year) + 1 
      });
      showToast(`Yearly rollover from ${year} to ${parseInt(year) + 1} completed successfully.`, 'success');
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.error || 'Rollover failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'var(--primary-light)', padding: '10px', borderRadius: '12px' }}>
              <Calendar size={24} color="var(--primary)" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Yearly Rollover</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X /></button>
        </div>

        <div style={{ background: '#fff9eb', border: '1px solid #ffeeba', padding: '16px', borderRadius: '12px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <AlertTriangle size={20} color="#856404" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p style={{ color: '#856404', fontWeight: '700', fontSize: '0.875rem', marginBottom: '4px' }}>Annual Initialization</p>
            <p style={{ color: '#856404', fontSize: '0.875rem', lineHeight: '1.5' }}>
              This will forward balances AND reset all privilege leaves (Special, Force, Wellness) to their full annual limits for the new year.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Year to Rollover FROM</label>
            <div style={{ position: 'relative' }}>
               <input 
                type="number" 
                className="input-field" 
                style={{ padding: '12px 16px', fontSize: '1.1rem', fontWeight: '700' }}
                placeholder="e.g., 2025" 
                required 
                value={year} 
                onChange={e => setYear(e.target.value)} 
                min="2000"
                max="2100"
              />
              <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                → {year ? parseInt(year) + 1 : 'New Year'}
              </span>
            </div>
            <p style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Balances will be carried over to the year {year ? parseInt(year) + 1 : 'following'} the selected year.
            </p>
          </div>

          <div style={{ marginTop: '40px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ padding: '12px 24px', fontWeight: '600' }}>Cancel</button>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading}
              style={{ padding: '12px 32px', fontWeight: '700', background: 'var(--primary)', boxShadow: '0 4px 14px 0 rgba(0, 118, 255, 0.39)' }}
            >
              {loading ? 'Processing...' : 'Confirm Rollover'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RolloverModal;
