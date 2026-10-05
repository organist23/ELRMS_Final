# ELRMS — Employee Leave Record Management System

A full-stack desktop and web application for managing, tracking, and reporting employee leave records and balances in a government or institutional office setting.

## 🎯 Overview

ELRMS (Employee Leave Record Management System) digitizes the traditional CSC-compliant leave card process, enabling:

- **Admin/HR**: Full control over employee records, leave encoding, approval workflows, credit generation, and reporting
- **System**: Automated leave credit accrual, annual rollover, tardy deduction tracking, and audit logging

## ✨ Features

### Employee Management
- ✅ Register and manage employee profiles (EMP-YYYY-XXX format IDs)
- ✅ Store employee details: sex, civil status, GSIS policy, TIN, position, office, employment status
- ✅ Soft-delete (archive) employees while preserving historical records
- ✅ Edit employee information with real-time updates

### Leave Encoding & Approval
- ✅ Encode leave applications (Vacation, Sick, Special, Force, Wellness, Solo Parent, Maternity, Paternity, SBW)
- ✅ Approve or reject pending leave applications
- ✅ Undo the most recent leave action (reversal support)
- ✅ Paginated leave history with employee search
- ✅ Track with-pay and without-pay deductions per leave entry

### Leave Balance Tracking
- ✅ Real-time leave balance display per leave type
- ✅ Balance Brought Forward (BBW) for VL and SL
- ✅ Forwarded credits carried from previous year
- ✅ Undertime with pay and leave without pay tracking

### Tardy / Undertime Deductions
- ✅ Encode tardy deductions using the Equivalent Day System
- ✅ Paginated tardy records with undo support
- ✅ Period-tagged remarks for each deduction entry

### Credit Generation & Annual Rollover
- ✅ Monthly VL/SL credit accrual (1.25 days each per month)
- ✅ Duplicate-safe accrual logs (per month-year)
- ✅ Yearly leave balance rollover with max forwarding rules (up to 30 days VL capped)
- ✅ Rollover history archive (per employee per year)
- ✅ Dashboard alerts when monthly credits or annual rollover are pending

### Ledger & Audit Trail
- ✅ Full transaction ledger with balance snapshots after every event
- ✅ Transaction types: LEAVE, CREDIT, TARDY, UNDO, MANUAL, ROLLOVER
- ✅ Searchable, paginated ledger view per employee
- ✅ Annual Ledger Summary Report (printable, year-selectable)

### Leave Card Report
- ✅ CSC-format Leave Card per employee, per year
- ✅ Year selector with archived years support
- ✅ Print-to-PDF via browser or Electron native PDF export

### System Settings
- ✅ Real-time server status monitoring (online/offline)
- ✅ One-click full SQL database backup (downloads `.sql` snapshot)
- ✅ Version information display (ELRMS v2.1.0-stable)

## 🖥️ Application Modes

ELRMS runs in two modes:

| Mode | Description |
|------|-------------|
| **Web App** | Browser-based via `npm run dev` (React + Vite + Express) |
| **Desktop App** | Packaged as a Windows `.exe` using Electron + electron-builder |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- MySQL 8+ (running locally)
- Modern web browser (Chrome/Edge recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/organist23/ELRMS_Final.git
   cd ELRMS_Final
   ```

2. **Install all dependencies** (root + server + client)
   ```bash
   npm run install:all
   ```

3. **Set up the database**
   ```bash
   mysql -u root -p < server/schema.sql
   ```

4. **Configure environment variables**

   Edit `server/.env` with your MySQL credentials:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=yourpassword
   DB_NAME=elrms_v2
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser** and navigate to `http://localhost:5173`

### Demo Credentials

**Admin Account:**
- Username: `admin`
- Password: `admin123`

### Running as a Desktop App (Electron)

```bash
npm run electron:dev
```

To build a distributable Windows installer:
```bash
npm run electron:build
```
Output will be in the `dist_electron/` folder.

## 📁 Project Structure

```
ELRMS_Final/
├── main.js                    # Electron main process
├── preload.js                 # Electron preload bridge
├── package.json               # Root scripts & electron-builder config
├── build/
│   └── icon.ico               # App icon for Windows installer
├── server/
│   ├── index.js               # Express API server (all routes)
│   ├── db.js                  # MySQL connection pool
│   ├── schema.sql             # Full database schema
│   ├── .env                   # Environment variables (DB credentials)
│   ├── ledger_desc.json       # Ledger transaction description templates
│   └── archive_desc.json      # Archive metadata
└── client/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.jsx            # Root app with routing & auth state
        ├── main.jsx           # React entry point
        ├── index.css          # Global design system & base styles
        ├── context/
        │   └── NotificationContext.jsx  # Toast & confirm dialog system
        ├── utils/
        │   └── api.js         # Axios instance (base URL config)
        ├── components/
        │   ├── Layout.jsx     # App shell with sidebar
        │   ├── Sidebar.jsx    # Navigation sidebar
        │   └── modals/
        │       ├── RegisterEmployeeModal.jsx  # New employee registration
        │       ├── EditEmployeeModal.jsx       # Edit employee profile
        │       ├── EncodeLeaveModal.jsx        # Encode leave application
        │       ├── EquivalentDayModal.jsx      # Tardy/undertime deduction
        │       └── RolloverModal.jsx           # Annual balance rollover
        └── pages/
            ├── Login.jsx              # Admin login page
            ├── Dashboard.jsx          # System overview & recent activity
            ├── Employees.jsx          # Employee list, search, management
            ├── Leaves.jsx             # Leave encoding, approval, history
            ├── Ledger.jsx             # Full ledger/audit trail view
            ├── LedgerSummary.jsx      # Annual ledger summary report
            ├── LeaveCardReport.jsx    # CSC-format leave card per employee
            └── Settings.jsx           # DB backup & system status
```

## 📋 Leave Types Supported

| Leave Type | Default Credits |
|------------|----------------|
| Vacation Leave (VL) | Accrued monthly (1.25 days/month) |
| Sick Leave (SL) | Accrued monthly (1.25 days/month) |
| Special Privilege Leave | 3 days/year |
| Force Leave | 5 days/year |
| Wellness Leave | 5 days/year |
| Solo Parent Leave | 7 days/year |
| Maternity Leave | 105 days |
| Paternity Leave | 7 days |
| Special Benefits for Women (SBW) | 30 days |

## 🗃️ Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `admin_users` | Administrator login credentials |
| `employees` | Employee profiles and metadata |
| `leave_balances` | Current leave credits per employee |
| `leave_applications` | Leave requests and approval workflow |
| `ledger` | Full audit trail of all balance changes |
| `accrual_logs` | Prevents duplicate monthly credit generation |
| `yearly_action_logs` | Prevents duplicate yearly rollover/reset |
| `yearly_credits_archive` | Historical rollover snapshots per employee |
| `tardy_deductions` | Tardy/undertime equivalent-day deductions |

## 🔄 System Workflow

1. **Admin registers** employee with profile details
2. **System initializes** leave balances with defaults or custom BBW values
3. **Monthly**: Admin generates VL/SL credits (1.25 days each, duplicate-safe)
4. **Employee files** leave → Admin encodes and approves/rejects
5. **Ledger** records every transaction with a full balance snapshot
6. **Admin prints** Leave Card Report (CSC format) per employee, per year
7. **Yearly**: Admin runs rollover — balances forwarded, privilege credits reset
8. **Backup**: Admin downloads full SQL snapshot before rollovers

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + Vite 6 |
| **Routing** | React Router v7 |
| **Styling** | Vanilla CSS (custom design system) |
| **HTTP Client** | Axios |
| **Icons** | Lucide React |
| **Backend** | Node.js + Express 5 |
| **Database** | MySQL 8 (via mysql2) |
| **Auth** | bcrypt + localStorage session |
| **Desktop** | Electron 41 |
| **Packaging** | electron-builder (NSIS installer for Windows) |
| **DB Backup** | mysqldump (server-side, downloaded as `.sql`) |

## 📊 Dashboard Features

- 🕐 Live real-time clock (date and time)
- 👥 Total registered employees count
- ⏳ Pending leave approvals counter
- 📋 Recent ledger activity (last 10 transactions)
- 🔔 Smart alerts for pending monthly accruals or annual rollover

## 🖨️ Reports

| Report | Format | Features |
|--------|--------|---------|
| Leave Card | Print / PDF | CSC-format, per employee, year-selectable |
| Annual Ledger Summary | Print / PDF | Chronological ledger for a selected year |
| Database Backup | `.sql` file | Full snapshot via one-click download |

## ⚙️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start web app (server + client concurrently) |
| `npm run start` | Start with node (no nodemon) |
| `npm run electron:dev` | Start full Electron desktop app in dev mode |
| `npm run electron:build` | Build Windows `.exe` installer |
| `npm run client:build` | Build client for production |
| `npm run install:all` | Install all dependencies (root + server + client) |

## 🔐 Security

- Admin session stored in localStorage (single-user system)
- Passwords hashed with bcrypt
- MySQL queries use parameterized statements (via mysql2)

## 🔄 Current Status

### ✅ Completed
- Admin login with session persistence
- Employee registration and management (CRUD)
- Leave encoding with all CSC leave types
- Approve / Reject / Undo leave workflow
- Tardy/equivalent-day deduction system
- Monthly credit generation (duplicate-safe)
- Annual balance rollover with archive history
- Full ledger audit trail with balance snapshots
- Leave Card Report (CSC format, printable/PDF)
- Annual Ledger Summary (printable/PDF)
- One-click SQL database backup
- Dashboard with live stats and system alerts
- Electron desktop app (Windows installer)
- Notification system (toast + confirm dialogs)

### 🚧 Potential Enhancements
- Employee self-service portal (view own leave card)
- Email notifications on leave approval/rejection
- Advanced reporting and export to Excel
- Role-based access (HR Officer vs. Admin)
- Mobile-responsive layout

## 📱 Browser Support

- ✅ Chrome / Edge (recommended)
- ✅ Firefox
- ✅ Electron (Windows desktop)

## 🤝 Contributing

This is an institutional project. For modifications or improvements, please coordinate with the system developer.

## 📄 License

© 2026 ELRMS Project. All rights reserved.

## 📞 Support

For technical support or questions, contact the system developer/administrator.

---

**Built with ❤️ for efficient and accurate government employee leave record management.**
