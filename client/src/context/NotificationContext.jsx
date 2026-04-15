import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X, HelpCircle } from 'lucide-react';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  const showToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const confirm = useCallback((title, message) => {
    return new Promise((resolve) => {
      setConfirmState({ title, message, resolve });
    });
  }, []);

  const handleConfirm = (value) => {
    if (confirmState) {
      confirmState.resolve(value);
      setConfirmState(null);
    }
  };

  return (
    <NotificationContext.Provider value={{ showToast, confirm }}>
      {children}

      {/* Toast Render System */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        pointerEvents: 'none'
      }}>
        {toasts.map((toast) => (
          <div key={toast.id} className={`glass-effect toast-item slide-in`} style={{
            padding: '16px 20px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            pointerEvents: 'auto',
            minWidth: '300px',
            borderLeft: `4px solid ${toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#3b82f6'}`
          }}>
            {toast.type === 'success' && <CheckCircle size={20} color="#10b981" />}
            {toast.type === 'error' && <AlertCircle size={20} color="#ef4444" />}
            {toast.type === 'info' && <Info size={20} color="#3b82f6" />}
            <span style={{ fontWeight: '500', fontSize: '0.9375rem', color: '#1e293b' }}>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Confirmation Modal Render System */}
      {confirmState && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content slide-in" style={{ maxWidth: '440px', textAlign: 'center', padding: '32px' }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              background: 'var(--primary-light)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 24px' 
            }}>
              <HelpCircle size={32} color="var(--primary)" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '12px' }}>{confirmState.title}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px', lineHeight: '1.6' }}>{confirmState.message}</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => handleConfirm(false)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => handleConfirm(true)}>Confirm Action</button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};
