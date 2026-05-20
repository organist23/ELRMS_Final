import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X, HelpCircle, RotateCcw } from 'lucide-react';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const [undoToast, setUndoToast] = useState(null);

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

  const showUndoToast = useCallback((message, duration = 6000) => {
    return new Promise((resolve) => {
      const id = Date.now();
      setUndoToast({ id, message, duration, resolve });

      const timer = setTimeout(() => {
        setUndoToast(null);
        resolve(true); // Proceed with action
      }, duration);

      // Store the timer ID to cancel it if undo is clicked
      setUndoToast(prev => ({ ...prev, timer }));
    });
  }, []);

  const handleUndo = () => {
    if (undoToast) {
      clearTimeout(undoToast.timer);
      undoToast.resolve(false); // Cancel action
      setUndoToast(null);
    }
  };

  const handleConfirm = (value) => {
    if (confirmState) {
      confirmState.resolve(value);
      setConfirmState(null);
    }
  };

  return (
    <NotificationContext.Provider value={{ showToast, confirm, showUndoToast }}>
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

      {/* Undo Toast with Progress Bar */}
      {undoToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 10001,
          pointerEvents: 'auto'
        }}>
          <div className="glass-effect slide-in" style={{
            padding: '16px 24px',
            borderRadius: '16px',
            background: 'white',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            minWidth: '340px',
            border: '1px solid var(--border)',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="spinning" style={{ display: 'flex', alignItems: 'center' }}>
                  <RotateCcw size={18} color="var(--primary)" />
                </div>
                <span style={{ fontWeight: '600', color: '#1e293b' }}>{undoToast.message}</span>
              </div>
              <button 
                onClick={handleUndo}
                style={{
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontWeight: '800',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Undo
              </button>
            </div>
            {/* Progress Bar Container */}
            <div style={{ 
              height: '4px', 
              background: '#f1f5f9', 
              borderRadius: '2px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div 
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  background: 'var(--primary)',
                  width: '100%',
                  animation: `deplete ${undoToast.duration}ms linear forwards`
                }}
              />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes deplete {
          from { width: 100%; }
          to { width: 0%; }
        }
        .spinning {
          animation: spin 2s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
      `}</style>

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
