// src/components/ApprovalQueue.jsx
import React from 'react';
import { useApp } from '../context/AppContext';
import { Check, X, Calendar, User } from 'lucide-react';

const ApprovalQueue = () => {
  const { applications, approveApplication, rejectApplication } = useApp();
  const pendingApps = applications.filter(app => app.status === 'Pending Approval');

  return (
    <div className="approval-page">
      <header className="page-header">
        <h1>Approval Queue</h1>
        <p className="text-muted">Review and process employee leave applications.</p>
      </header>

      {pendingApps.length === 0 ? (
        <div className="premium-card empty-state">
          <p>No pending applications at the moment.</p>
        </div>
      ) : (
        <div className="applications-list">
          {pendingApps.map(app => (
            <div key={app.id} className="premium-card application-card mb-24">
              <div className="app-main-info">
                <div className="user-profile">
                  <div className="avatar">
                    <User size={24} />
                  </div>
                  <div>
                    <h3>{app.employeeName}</h3>
                    <p className="text-muted">{app.employeeId}</p>
                  </div>
                </div>
                
                <div className="leave-details">
                  <div className="detail-item">
                    <label>Leave Type</label>
                    <p className="font-bold">{app.type}</p>
                  </div>
                  <div className="detail-item">
                    <label>Duration</label>
                    <p className="font-bold">{app.numDays} Days</p>
                  </div>
                  <div className="detail-item">
                    <label>Period</label>
                    <p>{new Date(app.dateFrom).toLocaleDateString()} - {new Date(app.dateTo).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="app-reason">
                <label>Reason / Details</label>
                <p>{app.reason || 'No reason provided.'}</p>
              </div>

              <div className="app-actions">
                <button 
                  className="btn-reject" 
                  onClick={() => rejectApplication(app.id)}
                >
                  <X size={18} />
                  <span>Reject</span>
                </button>
                <button 
                  className="btn-approve" 
                  onClick={() => approveApplication(app.id)}
                >
                  <Check size={18} />
                  <span>Approve</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApprovalQueue;
