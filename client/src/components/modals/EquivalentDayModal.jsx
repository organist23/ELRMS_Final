import React, { useState } from 'react';
import { X, Clock } from 'lucide-react';
import api from '../../utils/api';
import { useNotification } from '../../context/NotificationContext';

const EquivalentDayModal = ({ employee, onClose, onSuccess }) => {
  const { showToast, confirm } = useNotification();

  const now = new Date();
  const monthNames = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE",
                      "JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
  const defaultPeriod = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  const [equivalentDay, setEquivalentDay] = useState('');
  const [periodText, setPeriodText] = useState(defaultPeriod);
  const [remarks, setRemarks] = useState('');
  const [processing, setProcessing] = useState(false);

  const currentVL = parseFloat(employee.vacation_leave || 0);
  const inputVal = parseFloat(equivalentDay);
  const isValidInput = !isNaN(inputVal) && inputVal > 0;
  const vlAfter = isValidInput ? Math.max(0, currentVL - inputVal) : null;
  const isInsufficient = isValidInput && inputVal > currentVL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidInput || processing) return;

    const confirmed = await confirm(
      'Confirm Tardy Deduction',
      `Deduct ${inputVal} equivalent day(s) from ${employee.full_name}'s VL balance? This will create a permanent ledger record.`
    );
    if (!confirmed) return;

    try {
      setProcessing(true);
      await api.post('/tardy/deduct', {
        employee_id: employee.id,
        equivalent_day: inputVal,
        period_text: periodText,
        remarks: remarks || null
      });
      showToast(`Successfully deducted ${inputVal} day(s) from VL.`, 'success');
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to process deduction', 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content fade-in" style={{ maxWidth: '480px' }}>
        {/* Header */}
        <div className="flex-between mb-32">
          <div>
            <h2 className="font-bold mb-4" style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={22} style={{ color: 'var(--accent)' }} />
              Deduct Equivalent Day
            </h2>
            <p className="text-small text-muted font-bold">For: {employee.full_name}</p>
          </div>
          <button onClick={onClose} className="icon-btn"><X size={24} /></button>
        </div>

        {/* Current VL Balance Info */}
        <div style={{
          background: 'var(--accent-light)',
          border: '1px solid var(--accent)',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span className="font-bold text-small" style={{ color: 'var(--accent)' }}>Current VL Balance</span>
          <span className="font-bold" style={{ fontSize: '1.25rem', color: 'var(--accent)' }}>
            {currentVL.toFixed(3)}
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Equivalent Day Input */}
          <div className="form-group">
            <label className="label">Equivalent Day</label>
            <input
              type="number"
              className="input-field"
              step="0.001"
              min="0.001"
              placeholder="e.g. 0.125"
              value={equivalentDay}
              onChange={e => setEquivalentDay(e.target.value)}
              style={{ borderColor: isInsufficient ? '#dc2626' : '', fontWeight: 'bold', fontSize: '1.1rem' }}
              autoFocus
            />
            {isInsufficient && (
              <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '4px', fontWeight: 600 }}>
                ⚠ Insufficient VL balance. Remaining days without pay will be recorded.
              </p>
            )}
          </div>

          {/* Period Input */}
          <div className="form-group">
            <label className="label">Period</label>
            <input
              type="text"
              className="input-field"
              value={periodText}
              onChange={e => setPeriodText(e.target.value)}
              placeholder="e.g. MAY 2026"
            />
          </div>

          {/* Remarks */}
          <div className="form-group">
            <label className="label">Remarks <span style={{ opacity: 0.5, fontWeight: 400 }}>(Optional)</span></label>
            <input
              type="text"
              className="input-field"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="e.g. Late: 1 hour May 2"
            />
          </div>

          {/* VL After Deduction Preview */}
          {isValidInput && (
            <div style={{
              background: isInsufficient ? '#fef2f2' : '#f0fdf4',
              border: `1px solid ${isInsufficient ? '#fca5a5' : '#86efac'}`,
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span className="font-bold text-small" style={{ color: isInsufficient ? '#dc2626' : '#16a34a' }}>
                VL After Deduction
              </span>
              <span className="font-bold" style={{ fontSize: '1.25rem', color: isInsufficient ? '#dc2626' : '#16a34a' }}>
                {vlAfter.toFixed(3)}
              </span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex-between" style={{ gap: '16px', marginTop: '8px' }}>
            <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ flex: 1.5, opacity: (!isValidInput || processing) ? 0.5 : 1, cursor: (!isValidInput || processing) ? 'not-allowed' : 'pointer' }}
              disabled={!isValidInput || processing}
            >
              <Clock size={16} />
              {processing ? 'Processing...' : 'Confirm Deduct'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EquivalentDayModal;
