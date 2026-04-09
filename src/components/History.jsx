// src/components/History.jsx
import React from 'react';
import { useApp } from '../context/AppContext';
import { History as HistoryIcon, Search } from 'lucide-react';
import { formatCredits } from '../utils/leaveLogic';

const History = () => {
  const { ledger } = useApp();

  return (
    <div className="history-page">
      <header className="page-header">
        <h1>System History</h1>
        <p className="text-muted">A complete audit log of all transactions and leave approvals.</p>
      </header>

      <div className="premium-card">
        <div className="section-header mb-24">
          <div className="title-with-icon">
            <HistoryIcon size={20} className="text-primary" />
            <h2>Full Transaction Log</h2>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Employee / Actor</th>
              <th>Activity Description</th>
              <th>Resulting Status</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((entry) => (
              <tr key={entry.id}>
                <td>
                  <div className="date-display">
                    <p className="font-bold">{new Date(entry.date).toLocaleDateString()}</p>
                    <p className="text-muted small">{new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</p>
                  </div>
                </td>
                <td>
                  <div className="actor-display">
                    <p className="font-bold">{entry.employeeName}</p>
                    <p className="text-muted small">{entry.employeeId}</p>
                  </div>
                </td>
                <td className="transaction-text">
                  {entry.transaction}
                  {entry.balancesAfter && (
                    <div className="balance-snapshot-grid">
                      <div className="snapshot-item">VL: {formatCredits(entry.balancesAfter.vacationLeave)}</div>
                      <div className="snapshot-item">SL: {formatCredits(entry.balancesAfter.sickLeave)}</div>
                      <div className="snapshot-item">SPL: {formatCredits(entry.balancesAfter.specialLeave)}</div>
                      <div className="snapshot-item">FL: {formatCredits(entry.balancesAfter.forceLeave)}</div>
                      <div className="snapshot-item">WL: {formatCredits(entry.balancesAfter.wellnessLeave)}</div>
                      <div className="snapshot-item">SOLO: {formatCredits(entry.balancesAfter.soloParentLeave)}</div>
                    </div>
                  )}
                </td>
                <td>
                  <span className={`badge badge-${entry.status.toLowerCase().replace(' ', '-')}`}>
                    {entry.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default History;
