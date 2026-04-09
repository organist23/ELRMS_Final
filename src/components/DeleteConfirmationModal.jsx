// src/components/DeleteConfirmationModal.jsx
import React from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';

const DeleteConfirmationModal = ({ employee, onConfirm, onClose }) => {
  if (!employee) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content premium-card glass" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <div className="title-with-icon">
            <AlertTriangle size={24} className="text-danger" />
            <h2>Confirm Deletion</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={24} /></button>
        </div>

        <div className="modal-body p-24 text-center">
          <p className="mb-16">Are you sure you want to permanently delete <strong>{employee.fullName}</strong>?</p>
          <div className="alert-danger small">
            <p>This action cannot be undone. All leave history for this employee will be lost.</p>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-muted" onClick={onClose}>Cancel</button>
          <button 
            type="button" 
            className="btn-danger flex-btn"
            onClick={() => {
              onConfirm(employee.id);
              onClose();
            }}
          >
            <Trash2 size={18} />
            <span>Delete Employee</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
