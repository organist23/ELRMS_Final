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
      <div className="modal-content fade-in" style={{ maxWidth: '480px' }}>
        <div className="flex-between mb-32">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="icon-box icon-blue">
              <Calendar size={24} />
            </div>
            <h2 className="font-bold" style={{ fontSize: '1.5rem' }}>Yearly Rollover</h2>
          </div>
          <button onClick={onClose} className="icon-btn"><X size={24} /></button>
        </div>

        <div className="mb-32" style={{ borderLeft: '4px solid var(--warning)', background: 'var(--warning-light)', padding: '16px 20px', borderRadius: '4px' }}>
          <div className="flex items-center gap-12 mb-8">
            <AlertTriangle size={18} color="var(--warning)" />
            <span className="font-bold text-small" style={{ color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Administrative Warning</span>
          </div>
          <p className="text-small" style={{ color: '#92400e', fontWeight: '500', lineHeight: '1.5' }}>
            This process forwards balances from the source year and resets all privilege leaves to their full annual limits. This action is **permanent**.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-40">
            <label className="label" style={{ textAlign: 'center', marginBottom: '16px', fontSize: '0.7rem', opacity: 0.8 }}>Choose Source Year</label>
            
            <div className="flex items-center justify-center gap-24">
              <div style={{ flex: 1 }}>
                <input 
                  type="number" 
                  className="input-field" 
                  style={{ fontSize: '1.75rem', fontWeight: '800', textAlign: 'center', height: '70px', border: '2px solid var(--border)' }}
                  placeholder="2025" 
                  required 
                  value={year} 
                  onChange={e => setYear(e.target.value)} 
                  min="2000"
                  max="2100"
                />
                <p className="text-small font-bold text-center mt-8 text-muted">SOURCE YEAR</p>
              </div>

              <div className="flex items-center justify-center" style={{ color: 'var(--text-light)', paddingTop: '10px' }}>
                <span style={{ fontSize: '2rem' }}>→</span>
              </div>

              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary-light)', border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '1.75rem', fontWeight: '800', color: 'var(--primary)' }}>
                  {year ? parseInt(year) + 1 : '...'}
                </div>
                <p className="text-small font-bold text-center mt-8" style={{ color: 'var(--accent)' }}>TARGET YEAR</p>
              </div>
            </div>
          </div>

          <div className="flex-between" style={{ gap: '16px' }}>
            <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button 
              type="submit" 
              className="btn-primary" 
              style={{ flex: 1 }}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Start Rollover'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RolloverModal;
