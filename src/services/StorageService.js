import { LEAVE_DEFAULTS, addMonthlyCredits, calculateDeduction } from '../utils/leaveLogic';

const STORAGE_KEY = 'elrms_data_v1';

const INITIAL_DATA = {
  employees: [
    {
      id: 'EMP-2013-001',
      fullName: 'PARAGAS, BRENDALIE C.',
      status: 'PERMANENT',
      isActive: true,
      civilStatus: 'MARRIED',
      gsisPolicy: '2001556677',
      position: 'MUNICIPAL ACCOUNTANT',
      entranceOfDuty: '2013-09-02',
      tin: '123-456-789',
      office: 'MACCO',
      balances: { ...LEAVE_DEFAULTS }
    }
  ],
  applications: [],
  ledger: [],
  generatedPeriods: [],
  lastResetYear: new Date().getFullYear()
};

class StorageService {
  constructor() {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const data = { ...INITIAL_DATA };
      this.addLedgerEntry('EMP-2013-001', 'Initial Balance Setup', 'COMPLETED', data);
      this.save(data);
    } else {
      this.checkAndResetYearlyPrivileges();
    }
  }

  save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  getData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      this.save(INITIAL_DATA);
      return INITIAL_DATA;
    }
    return JSON.parse(raw);
  }

  getEmployees() {
    return this.getData().employees;
  }

  getEmployeeById(id) {
    return this.getEmployees().find(emp => emp.id === id);
  }

  addEmployee(employee) {
    const data = this.getData();
    const newEmployee = {
      ...employee,
      isActive: true,
      balances: { ...LEAVE_DEFAULTS }
    };
    data.employees.push(newEmployee);
    this.addLedgerEntry(newEmployee.id, 'Employee Registered', 'COMPLETED', data);
    this.save(data);
    return newEmployee;
  }

  updateEmployee(updatedEmp) {
    const data = this.getData();
    data.employees = data.employees.map(emp => emp.id === updatedEmp.id ? updatedEmp : emp);
    this.addLedgerEntry(updatedEmp.id, 'Profile Information Updated by Admin', 'COMPLETED', data);
    this.save(data);
  }

  updateEmployeeBalances(employeeId, newBalances) {
    const data = this.getData();
    const emp = data.employees.find(e => e.id === employeeId);
    if (!emp) return;

    emp.balances = { ...newBalances };
    
    this.addLedgerEntry(employeeId, `Manual Correction: Balances updated by Admin`, 'COMPLETED', data);
    this.save(data);
  }

  deleteEmployee(id) {
    const data = this.getData();
    data.employees = data.employees.filter(emp => emp.id !== id);
    this.save(data);
  }

  addApplication(app) {
    const data = this.getData();
    const newApp = {
      ...app,
      id: Date.now(),
      status: 'Pending Approval',
      appliedAt: new Date().toISOString()
    };
    data.applications.push(newApp);
    
    this.addLedgerEntry(newApp.employeeId, `Leave Request: ${newApp.numDays} Days ${newApp.type}`, 'Pending Approval', data);
    this.save(data);
    return newApp;
  }

  getApplications() {
    return this.getData().applications;
  }

  approveApplication(appId) {
    const data = this.getData();
    const appIndex = data.applications.findIndex(a => a.id === appId);
    if (appIndex === -1) return;

    const app = data.applications[appIndex];
    if (app.status !== 'Pending Approval') return;
    
    app.status = 'Approved';

    const employee = data.employees.find(e => e.id === app.employeeId);
    if (employee) {
      const typeKey = this.mapTypeToKey(app.type);
      const currentBalance = parseFloat(employee.balances[typeKey]);
      const appliedDays = parseFloat(app.numDays);

      const isEarnedLeave = typeKey === 'vacationLeave' || typeKey === 'sickLeave';
      
      if (!isEarnedLeave) {
        // STRICT ENFORCEMENT for Privileges
        if (currentBalance < appliedDays) {
          throw new Error(`Insufficient ${app.type} privileges.`);
        }
        employee.balances[typeKey] = currentBalance - appliedDays;
        this.addLedgerEntry(app.employeeId, `Approved: ${appliedDays.toFixed(3)} Days ${app.type}`, 'Approved', data);
      } else {
        // EARNED LEAVE (VL/SL) - Support Split
        const paidDays = Math.min(appliedDays, currentBalance);
        const unpaidDays = Math.max(0, appliedDays - paidDays);
        employee.balances[typeKey] = currentBalance - paidDays;

        const detail = unpaidDays > 0 
          ? `${app.numDays} Days ${app.type} (${paidDays.toFixed(3)} Under Time w/ Pay, ${unpaidDays.toFixed(3)} w/o Pay)`
          : `${app.numDays} Days ${app.type} (All Under Time w/ Pay)`;

        this.addLedgerEntry(app.employeeId, `Approved: ${detail}`, 'Approved', data);
      }
    }

    this.save(data);
  }

  rejectApplication(appId) {
    const data = this.getData();
    const app = data.applications.find(a => a.id === appId);
    if (app) {
      app.status = 'Rejected';
      this.addLedgerEntry(app.employeeId, `Rejected: ${app.numDays} Days ${app.type}`, 'Rejected', data);
      this.save(data);
    }
  }

  generateMonthlyCredits(month, year) {
    const data = this.getData();
    const periodKey = `${year}-${String(month).padStart(2, '0')}`;

    if (data.generatedPeriods && data.generatedPeriods.includes(periodKey)) {
      throw new Error(`Credits for ${month}/${year} have already been generated.`);
    }

    data.employees.filter(e => e.isActive).forEach(emp => {
      emp.balances.vacationLeave = addMonthlyCredits(parseFloat(emp.balances.vacationLeave));
      emp.balances.sickLeave = addMonthlyCredits(parseFloat(emp.balances.sickLeave));
    });

    if (!data.generatedPeriods) data.generatedPeriods = [];
    data.generatedPeriods.push(periodKey);

    this.addLedgerEntry('SYSTEM', `Generated Monthly 1.25 Credits for ${month}/${year}`, 'COMPLETED', data);
    this.save(data);
  }

  addLedgerEntry(employeeId, transaction, status, existingData = null) {
    const data = existingData || this.getData();
    const emp = data.employees.find(e => e.id === employeeId);
    
    const balancesSnapshot = emp ? { ...emp.balances } : null;

    data.ledger.unshift({
      id: Date.now() + Math.random(),
      date: new Date().toISOString(),
      employeeId: employeeId,
      employeeName: emp ? emp.fullName : 'System',
      transaction: transaction,
      status: status,
      balancesAfter: balancesSnapshot
    });
    
    if (!existingData) {
      this.save(data);
    }
  }

  getLedger() {
    return this.getData().ledger;
  }

  checkAndResetYearlyPrivileges() {
    const data = this.getData();
    const currentYear = new Date().getFullYear();
    const lastReset = data.lastResetYear || 0;

    if (currentYear > lastReset) {
      data.employees.forEach(emp => {
        emp.balances.specialLeave = LEAVE_DEFAULTS.specialLeave;
        emp.balances.forceLeave = LEAVE_DEFAULTS.forceLeave;
        emp.balances.wellnessLeave = LEAVE_DEFAULTS.wellnessLeave;
        emp.balances.soloParentLeave = LEAVE_DEFAULTS.soloParentLeave;
        
        this.addLedgerEntry(emp.id, `Annual Reset: Privilege balances restored for ${currentYear}`, 'COMPLETED', data);
      });
      data.lastResetYear = currentYear;
      this.save(data);
    }
  }

  mapTypeToKey(type) {
    const mapping = {
      'Vacation Leave': 'vacationLeave',
      'Sick Leave': 'sickLeave',
      'Special Leave': 'specialLeave',
      'Force Leave': 'forceLeave',
      'Wellness Leave': 'wellnessLeave',
      'Solo Parent Leave': 'soloParentLeave'
    };
    return mapping[type] || type;
  }
}

export default new StorageService();
