// src/components/ApprovalQueue.jsx
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Check, X, Calendar, User, Search } from 'lucide-react';

const ApprovalQueue = () => {
  const { applications, approveApplication, rejectApplication } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  
  const pendingApps = applications.filter(app => 
    app.status === 'Pending Approval' &&
    (app.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
     app.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
     app.type.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPending = applications.filter(app => app.status === 'Pending Approval').length;

  return (
    <div className="approval-page">
      <header className="page-header flex-header">
        <div>
          <h1>Approval Queue</h1>
          <p className="text-muted">Review and process employee leave applications.</p>
        </div>
      </header>

      <div className="search-bar premium-card mb-24">
        <Search size={20} className="text-muted" />
        <input 
          type="text" 
          placeholder="Search pending requests by name, ID, or type..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {totalPending === 0 ? (
        <div className="premium-card empty-state">
          <p>No pending applications at the moment.</p>
        </div>
      ) : pendingApps.length === 0 ? (
        <div className="premium-card empty-state">
          <p>No pending applications match your search.</p>
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
