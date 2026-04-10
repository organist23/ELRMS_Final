// src/components/Employees.jsx
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, UserPlus, Printer, Trash2, Edit3, User } from 'lucide-react';
import EncodeLeaveModal from './EncodeLeaveModal';
import RegisterEmployeeModal from './RegisterEmployeeModal';
import EditBalanceModal from './EditBalanceModal';
import EditEmployeeModal from './EditEmployeeModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import { formatCredits } from '../utils/leaveLogic';

const Employees = () => {
  const { employees, deleteEmployee } = useApp();
  const [search, setSearch] = useState('');
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [empToDelete, setEmpToDelete] = useState(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Sync selected employee after update
  const currentEmp = employees.find(e => e.id === selectedEmp?.id) || selectedEmp;

  const filteredEmployees = employees.filter(emp =>
    emp.fullName.toLowerCase().includes(search.toLowerCase()) ||
    emp.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="employees-page">
      {/* ... header ... */}
      <header className="page-header flex-header">
        <div>
          <h1>Employees</h1>
          <p className="text-muted">Search and manage employee records and credits.</p>
        </div>
        <button
          className="btn-primary flex-btn"
          onClick={() => setIsRegModalOpen(true)}
        >
          <UserPlus size={20} />
          <span>Register New</span>
        </button>
      </header>

      <div className="search-bar premium-card mb-24">
        <Search size={20} className="text-muted" />
        <input
          type="text"
          placeholder="Search by ID or Name (e.g. PARAGAS or EMP-2013-001)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="employees-grid">
        <div className="premium-card list-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>EID</th>
                <th>Name</th>
                <th>Position</th>
                <th>Office</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(emp => (
                <tr
                  key={emp.id}
                  className={currentEmp?.id === emp.id ? 'selected-row' : ''}
                  onClick={() => setSelectedEmp(emp)}
                >
                  <td>{emp.id}</td>
                  <td className="font-bold">{emp.fullName}</td>
                  <td>{emp.position}</td>
                  <td>{emp.office}</td>
                  <td><span className="badge badge-approved">{emp.status}</span></td>
                  <td>
                    <div className="action-btns">
                      <button className="icon-btn text-primary" title="Print Record"><Printer size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {currentEmp && (
          <div className="premium-card details-container">
            <div className="details-header">
              <h3>Employee Details</h3>
              <div className="header-actions">
                <button className="icon-btn text-warning" title="Edit Profile" onClick={() => setIsProfileModalOpen(true)}>
                  <User size={20} />
                </button>
                <button className="icon-btn text-primary" title="Edit Balances" onClick={() => setIsEditModalOpen(true)}>
                  <Edit3 size={20} />
                </button>
                <button className="btn-secondary" onClick={() => setIsLeaveModalOpen(true)}>Encode Leave</button>
              </div>
            </div>
            <div className="info-grid">
              <div className="info-item">
                <label>Full Name</label>
                <p>{currentEmp.fullName}</p>
              </div>
              <div className="info-item">
                <label>EID</label>
                <p>{currentEmp.id}</p>
              </div>
              <div className="info-item">
                <label>Position</label>
                <p>{currentEmp.position}</p>
              </div>
              <div className="info-item">
                <label>Civil Status</label>
                <p>{currentEmp.civilStatus}</p>
              </div>
              <div className="info-item">
                <label>GSIS Policy No.</label>
                <p>{currentEmp.gsisPolicy}</p>
              </div>
              <div className="info-item">
                <label>TIN</label>
                <p>{currentEmp.tin}</p>
              </div>
              <div className="info-item">
                <label>Entrance of Duty</label>
                <p>{new Date(currentEmp.entranceOfDuty).toLocaleDateString()}</p>
              </div>
              <div className="info-item">
                <label>Office</label>
                <p>{currentEmp.office}</p>
              </div>
            </div>

            <div className="credits-table-section">
              <h4>Current Leave Credits</h4>
              <table className="credits-table">
                <thead>
                  <tr>
                    <th>Leave Type</th>
                    <th>Remaining Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Vacation Leave (VL)</td>
                    <td className="credit-value">{formatCredits(currentEmp.balances.vacationLeave)}</td>
                  </tr>
                  <tr>
                    <td>Sick Leave (SL)</td>
                    <td className="credit-value">{formatCredits(currentEmp.balances.sickLeave)}</td>
                  </tr>
                  <tr>
                    <td>Special Leave (Privilege)</td>
                    <td className="credit-value">{formatCredits(currentEmp.balances.specialLeave)}</td>
                  </tr>
                  <tr>
                    <td>Force Leave (Privilege)</td>
                    <td className="credit-value">{formatCredits(currentEmp.balances.forceLeave)}</td>
                  </tr>
                  <tr>
                    <td>Wellness Leave (Privilege)</td>
                    <td className="credit-value">{formatCredits(currentEmp.balances.wellnessLeave)}</td>
                  </tr>
                  <tr>
                    <td>Solo Parent Leave (Privilege)</td>
                    <td className="credit-value">{formatCredits(currentEmp.balances.soloParentLeave)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {isLeaveModalOpen && currentEmp && (
        <EncodeLeaveModal
          employee={currentEmp}
          onClose={() => setIsLeaveModalOpen(false)}
        />
      )}

      {isRegModalOpen && (
        <RegisterEmployeeModal
          onClose={() => setIsRegModalOpen(false)}
        />
      )}

      {isEditModalOpen && currentEmp && (
        <EditBalanceModal
          employee={currentEmp}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}

      {isProfileModalOpen && currentEmp && (
        <EditEmployeeModal
          employee={currentEmp}
          onDelete={(emp) => {
            setIsProfileModalOpen(false);
            setEmpToDelete(emp);
          }}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}

      {empToDelete && (
        <DeleteConfirmationModal
          employee={empToDelete}
          onConfirm={deleteEmployee}
          onClose={() => setEmpToDelete(null)}
        />
      )}
    </div>
  );
};

export default Employees;
