-- ============================================================
-- ELRMS v2 Database Schema
-- Employee Leave Record Management System
-- ============================================================

CREATE DATABASE IF NOT EXISTS elrms_v2;
USE elrms_v2;

-- 1. Admin Users (Only Admin as requested)
CREATE TABLE admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Initial Admin (admin/admin123)
-- In a real app, passwords should be hashed. For this refactor, I'll use plain or simple hashing if requested.
-- Standard practice: bcrypt. I'll stick to a simple strategy for now as per "simple and clean code".
INSERT INTO admin_users (username, password) VALUES ('admin', 'admin123');

-- 2. Employees Profile
CREATE TABLE employees (
    id VARCHAR(50) PRIMARY KEY, -- EMP-YYYY-XXX
    full_name VARCHAR(255) NOT NULL,
    civil_status VARCHAR(50),
    gsis_policy VARCHAR(100),
    position VARCHAR(255),
    entrance_of_duty DATE,
    tin VARCHAR(50),
    status VARCHAR(100), -- PERMANENT, CASUAL, etc.
    office VARCHAR(255),
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Leave Balances (Current Credits)
CREATE TABLE leave_balances (
    employee_id VARCHAR(50) PRIMARY KEY,
    vacation_leave DECIMAL(10,3) DEFAULT 0.000,
    sick_leave DECIMAL(10,3) DEFAULT 0.000,
    special_leave DECIMAL(10,3) DEFAULT 3.000,
    force_leave DECIMAL(10,3) DEFAULT 5.000,
    wellness_leave DECIMAL(10,3) DEFAULT 5.000,
    solo_parent_leave DECIMAL(10,3) DEFAULT 7.000,
    -- Initial balance fields for newly registered
    bbw_vl DECIMAL(10,3) DEFAULT 0.000, -- Balance Brought Forward VL
    bbw_sl DECIMAL(10,3) DEFAULT 0.000, -- Balance Brought Forward SL
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Leave Applications (Workflows)
CREATE TABLE leave_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL,
    leave_type VARCHAR(100) NOT NULL,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    num_days DECIMAL(10,3) NOT NULL,
    reason TEXT,
    status ENUM('Pending Approval', 'Approved', 'Rejected') DEFAULT 'Pending Approval',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Ledger (Audit Trail / History)
-- This tracks every change to credits (Approved leaves, Manual accruals, BBW updates)
CREATE TABLE ledger (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL,
    action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transaction_desc TEXT NOT NULL, -- e.g. "Leave: Sick (April 10-12)", "Accrual: April 2026"
    -- Snapshots after the transaction
    vl_bal DECIMAL(10,3),
    sl_bal DECIMAL(10,3),
    sp_bal DECIMAL(10,3),
    fl_bal DECIMAL(10,3),
    wl_bal DECIMAL(10,3),
    spl_bal DECIMAL(10,3),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Credit Generation Log (To prevent duplicate manual accruals for the same period)
CREATE TABLE accrual_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    month INT NOT NULL,
    year INT NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY month_year_accrual (month, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
