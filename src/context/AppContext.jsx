// src/context/AppContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import StorageService from '../services/StorageService';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [data, setData] = useState({
    employees: [],
    applications: [],
    ledger: []
  });
  const [loading, setLoading] = useState(true);

  const refreshData = () => {
    const employees = StorageService.getEmployees();
    const applications = StorageService.getApplications();
    const ledger = StorageService.getLedger();
    setData({ employees, applications, ledger });
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const addEmployee = (emp) => {
    StorageService.addEmployee(emp);
    refreshData();
  };

  const updateEmployee = (emp) => {
    StorageService.updateEmployee(emp);
    refreshData();
  };

  const updateEmployeeBalances = (id, balances) => {
    StorageService.updateEmployeeBalances(id, balances);
    refreshData();
  };

  const deleteEmployee = (id) => {
    StorageService.deleteEmployee(id);
    refreshData();
  };

  const addApplication = (app) => {
    StorageService.addApplication(app);
    refreshData();
  };

  const approveApplication = (id) => {
    StorageService.approveApplication(id);
    refreshData();
  };

  const rejectApplication = (id) => {
    StorageService.rejectApplication(id);
    refreshData();
  };

  const generateMonthlyCredits = (m, y) => {
    StorageService.generateMonthlyCredits(m, y);
    refreshData();
  };

  return (
    <AppContext.Provider value={{ 
      ...data, 
      loading, 
      addEmployee, 
      updateEmployee, 
      updateEmployeeBalances,
      deleteEmployee,
      addApplication,
      approveApplication,
      rejectApplication,
      generateMonthlyCredits,
      refreshData
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
