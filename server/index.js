const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- ROUTES ---

// 1. Authentication
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [users] = await db.execute('SELECT * FROM admin_users WHERE username = ? AND password = ?', [username, password]);
        if (users.length > 0) {
            res.json({ success: true, user: { username: users[0].username } });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Employees CRUD
app.get('/api/employees', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT e.*, b.vacation_leave, b.sick_leave, b.special_leave, b.force_leave, b.wellness_leave, b.solo_parent_leave, b.bbw_vl, b.bbw_sl, b.forwarded_vl, b.forwarded_sl
            FROM employees e
            JOIN leave_balances b ON e.id = b.employee_id
            WHERE e.is_active = 1
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/employees', async (req, res) => {
    const { id, full_name, civil_status, gsis_policy, position, entrance_of_duty, tin, status, office, initial_vl, initial_sl } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        await connection.execute(
            'INSERT INTO employees (id, full_name, civil_status, gsis_policy, position, entrance_of_duty, tin, status, office) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, full_name, civil_status, gsis_policy, position, entrance_of_duty, tin, status, office]
        );

        await connection.execute(
            'INSERT INTO leave_balances (employee_id, vacation_leave, sick_leave, bbw_vl, bbw_sl, forwarded_vl, forwarded_sl) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, initial_vl || 0, initial_sl || 0, initial_vl || 0, initial_sl || 0, initial_vl || 0, initial_sl || 0]
        );

        await connection.execute(
            'INSERT INTO ledger (employee_id, transaction_desc, vl_bal, sl_bal, sp_bal, fl_bal, wl_bal, spl_bal, transaction_type, remarks, period_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, 'First Registration: Initial Balance Set', initial_vl || 0, initial_sl || 0, 3, 5, 5, 7, 'REGISTRATION', 'Initial Balance', new Date().getFullYear()]
        );

        await connection.commit();
        res.json({ success: true, message: 'Employee registered' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

app.put('/api/employees/:id', async (req, res) => {
    const { full_name, civil_status, gsis_policy, position, entrance_of_duty, tin, status, office, vacation_leave, sick_leave } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get old balances for comparison
        const [old] = await connection.execute('SELECT * FROM leave_balances WHERE employee_id = ?', [req.params.id]);
        const old_vl = old[0]?.vacation_leave || 0;
        const old_sl = old[0]?.sick_leave || 0;

        // 2. Update credentials
        await connection.execute(
            'UPDATE employees SET full_name=?, civil_status=?, gsis_policy=?, position=?, entrance_of_duty=?, tin=?, status=?, office=? WHERE id=?',
            [full_name, civil_status, gsis_policy, position, entrance_of_duty, tin, status, office, req.params.id]
        );

        // 3. Update balances (VL and SL only)
        await connection.execute(
            'UPDATE leave_balances SET vacation_leave = ?, sick_leave = ? WHERE employee_id = ?',
            [vacation_leave, sick_leave, req.params.id]
        );

        // 4. Ledger entry if balances changed
        if (parseFloat(old_vl) !== parseFloat(vacation_leave) || parseFloat(old_sl) !== parseFloat(sick_leave)) {
            const [b_rows] = await connection.execute('SELECT * FROM leave_balances WHERE employee_id = ?', [req.params.id]);
            const b = b_rows[0];
            const desc = `Manual Update: ${full_name}'s balances adjusted by Admin. (Old VL: ${parseFloat(old_vl).toFixed(3)}, Old SL: ${parseFloat(old_sl).toFixed(3)})`;
            
            await connection.execute(
                'INSERT INTO ledger (employee_id, transaction_desc, vl_bal, sl_bal, sp_bal, fl_bal, wl_bal, spl_bal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [req.params.id, desc, b.vacation_leave, b.sick_leave, b.special_leave, b.force_leave, b.wellness_leave, b.solo_parent_leave]
            );
        }

        await connection.commit();
        res.json({ success: true, message: 'Employee and balances updated' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

app.delete('/api/employees/:id', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Soft Delete
        await connection.execute('UPDATE employees SET is_active = 0 WHERE id = ?', [req.params.id]);

        // 2. Log in Ledger
        const [b_rows] = await connection.execute('SELECT * FROM leave_balances WHERE employee_id = ?', [req.params.id]);
        const b = b_rows[0];
        
        await connection.execute(
            'INSERT INTO ledger (employee_id, transaction_desc, vl_bal, sl_bal, sp_bal, fl_bal, wl_bal, spl_bal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [req.params.id, 'Account Archived: Employee moved to inactive records.', b.vacation_leave, b.sick_leave, b.special_leave, b.force_leave, b.wellness_leave, b.solo_parent_leave]
        );

        await connection.commit();
        res.json({ success: true, message: 'Employee archived successfully' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

// 3. Leave Applications
app.get('/api/leaves/pending', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT l.*, e.full_name
            FROM leave_applications l
            JOIN employees e ON l.employee_id = e.id
            WHERE l.status = 'Pending Approval'
            ORDER BY l.applied_at DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/leaves/apply', async (req, res) => {
    let { employee_id, leave_type, date_from, date_to, num_days, reason, inclusive_dates } = req.body;
    try {
        // Convert empty strings to null for DB compatibility
        const clean_from = date_from || null;
        const clean_to = date_to || null;

        // Validation check for privileges
        const [balanceRows] = await db.execute('SELECT * FROM leave_balances WHERE employee_id = ?', [employee_id]);
        if (balanceRows.length === 0) return res.status(404).json({ error: 'Employee balance not found' });
        
        const balance = balanceRows[0];
        const limits = {
            'Special Leave': 3,
            'Force Leave': 5,
            'Wellness Leave': 5,
            'Solo Parent Leave': 7
        };

        const field_map = {
            'Special Leave': 'special_leave',
            'Force Leave': 'force_leave',
            'Wellness Leave': 'wellness_leave',
            'Solo Parent Leave': 'solo_parent_leave'
        };

        if (limits[leave_type]) {
            const field = field_map[leave_type];
            const current_bal = parseFloat(balance[field]);
            if (parseFloat(num_days) > current_bal) {
                 return res.status(400).json({ error: `Not enough credits in ${leave_type}. Remaining: ${current_bal.toFixed(3)}` });
            }
        }

        await db.execute(
            'INSERT INTO leave_applications (employee_id, leave_type, date_from, date_to, num_days, inclusive_dates, reason) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [employee_id, leave_type, clean_from, clean_to, num_days, inclusive_dates, reason]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/leaves/approve', async (req, res) => {
    const { application_id } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [apps] = await connection.execute('SELECT * FROM leave_applications WHERE id = ?', [application_id]);
        if (apps.length === 0) throw new Error('Application not found');
        const app_data = apps[0];

        const field_map = {
            'Vacation Leave': 'vacation_leave',
            'Sick Leave': 'sick_leave',
            'Special Leave': 'special_leave',
            'Force Leave': 'force_leave',
            'Wellness Leave': 'wellness_leave',
            'Solo Parent Leave': 'solo_parent_leave'
        };
        const field = field_map[app_data.leave_type];
        
        // --- Split Pay Math ---
        const [balances] = await connection.execute('SELECT * FROM leave_balances WHERE employee_id = ?', [app_data.employee_id]);
        const bal = balances[0];
        const current_val = parseFloat(bal[field] || 0);
        const requested_days = parseFloat(app_data.num_days || 0);

        if (requested_days > current_val) {
            with_pay = current_val;
            without_pay = requested_days - current_val;
        } else {
            with_pay = requested_days;
            without_pay = 0;
        }

        await connection.execute(
            `UPDATE leave_balances SET ${field} = ${field} - ?, leave_w_o_pay = leave_w_o_pay + ? WHERE employee_id = ?`,
            [with_pay, without_pay, app_data.employee_id]
        );

        await connection.execute(
            'UPDATE leave_applications SET status = "Approved", with_pay = ?, without_pay = ? WHERE id = ?',
            [with_pay, without_pay, application_id]
        );

        // Snapshots for ledger
        const [new_bal] = await connection.execute('SELECT * FROM leave_balances WHERE employee_id = ?', [app_data.employee_id]);
        const b = new_bal[0];

        const fmt = (n) => parseFloat(parseFloat(n).toFixed(3)).toString();
        const desc = `Leave Approved: ${app_data.leave_type} (${app_data.inclusive_dates}). Status: ${fmt(with_pay)} Paid, ${fmt(without_pay)} Without Pay.`;
        const leave_type_short = app_data.leave_type === 'Vacation Leave' ? 'VL' : (app_data.leave_type === 'Sick Leave' ? 'SL' : app_data.leave_type);

        await connection.execute(
            'INSERT INTO ledger (employee_id, transaction_desc, vl_bal, sl_bal, sp_bal, fl_bal, wl_bal, spl_bal, transaction_type, leave_type, deducted_with_pay, deducted_without_pay, remarks, period_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [app_data.employee_id, desc, b.vacation_leave, b.sick_leave, b.special_leave, b.force_leave, b.wellness_leave, b.solo_parent_leave, 'LEAVE', leave_type_short, with_pay, without_pay, app_data.reason, app_data.inclusive_dates]
        );

        await connection.commit();
        res.json({ success: true });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

app.post('/api/leaves/undo', async (req, res) => {
    const { application_id } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [apps] = await connection.execute('SELECT * FROM leave_applications WHERE id = ?', [application_id]);
        if (apps.length === 0) throw new Error('Application not found');
        const app_data = apps[0];
        if (app_data.status !== 'Approved') throw new Error('Only approved applications can be undone');

        const field_map = {
            'Vacation Leave': 'vacation_leave',
            'Sick Leave': 'sick_leave',
            'Special Leave': 'special_leave',
            'Force Leave': 'force_leave',
            'Wellness Leave': 'wellness_leave',
            'Solo Parent Leave': 'solo_parent_leave'
        };
        const field = field_map[app_data.leave_type];

        // Reverse the math
        await connection.execute(
            `UPDATE leave_balances SET ${field} = ${field} + ?, leave_w_o_pay = leave_w_o_pay - ? WHERE employee_id = ?`,
            [app_data.with_pay, app_data.without_pay, app_data.employee_id]
        );

        await connection.execute('UPDATE leave_applications SET status = "Pending Approval" WHERE id = ?', [application_id]);

        const [new_bal] = await connection.execute('SELECT * FROM leave_balances WHERE employee_id = ?', [app_data.employee_id]);
        const b = new_bal[0];

        await connection.execute(
            'INSERT INTO ledger (employee_id, transaction_desc, vl_bal, sl_bal, sp_bal, fl_bal, wl_bal, spl_bal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [app_data.employee_id, `UNDO APPROVAL: Restored ${app_data.with_pay} days to ${app_data.leave_type}`, b.vacation_leave, b.sick_leave, b.special_leave, b.force_leave, b.wellness_leave, b.solo_parent_leave]
        );

        await connection.commit();
        res.json({ success: true });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

app.post('/api/leaves/reject', async (req, res) => {
    const { application_id } = req.body;
    try {
        await db.execute('UPDATE leave_applications SET status = "Rejected" WHERE id = ?', [application_id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Accrual & Manual Triggers
app.post('/api/accrual/generate', async (req, res) => {
    const { month, year } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Check if already generated
        const [logs] = await connection.execute('SELECT * FROM accrual_logs WHERE month = ? AND year = ?', [month, year]);
        if (logs.length > 0) throw new Error('Credits already generated for this month and year');

        // 2. Add 1.25 to all active employees
        await connection.execute('UPDATE leave_balances SET vacation_leave = vacation_leave + 1.25, sick_leave = sick_leave + 1.25');

        // 3. Log into accrual_logs
        await connection.execute('INSERT INTO accrual_logs (month, year) VALUES (?, ?)', [month, year]);

        // 4. Log into Ledger for all (Simplified: just one entry or per employee)
        // Senior dev note: In a large system, we'd log per employee. For simplicity here:
        const [emps] = await connection.execute('SELECT employee_id FROM leave_balances');
        for (const emp of emps) {
            const [b_rows] = await connection.execute('SELECT * FROM leave_balances WHERE employee_id = ?', [emp.employee_id]);
            const b = b_rows[0];
            const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
            const periodText = `AS OF ${monthNames[month - 1]}`;

            await connection.execute(
                'INSERT INTO ledger (employee_id, transaction_desc, vl_bal, sl_bal, sp_bal, fl_bal, wl_bal, spl_bal, transaction_type, earned, remarks, period_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [emp.employee_id, `Monthly Accrual: ${month}/${year} (+1.25 VL/SL)`, b.vacation_leave, b.sick_leave, b.special_leave, b.force_leave, b.wellness_leave, b.solo_parent_leave, 'CREDIT', 1.25, 'Monthly Credit', periodText]
            );
        }

        await connection.commit();
        res.json({ success: true, message: `Successfully generated credits for ${month}/${year}` });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

// Privilege reset is now integrated into the Yearly Rollover process.
// Individual privilege resets can still be performed manually if needed by adjusting employee profiles.

app.post('/api/accrual/rollover', async (req, res) => {
    const { from_year, to_year } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Check if rollover already performed for this source year
        const [existing] = await connection.execute(
            'SELECT * FROM yearly_action_logs WHERE action_type = "ROLLOVER" AND year = ?',
            [from_year]
        );
        if (existing.length > 0) {
            throw new Error(`Yearly rollover for ${from_year} has already been completed.`);
        }

        // 2. Perform Dual Action: Move current VL/SL to Forwarded AND Reset Privileges to defaults
        await connection.execute(`
            UPDATE leave_balances 
            SET forwarded_vl = vacation_leave, 
                forwarded_sl = sick_leave,
                special_leave = 3.000, 
                force_leave = 5.000, 
                wellness_leave = 5.000, 
                solo_parent_leave = 7.000
        `);

        // 3. Log in ledger and Archive snapshots for all employees
        const [emps] = await connection.execute('SELECT employee_id FROM leave_balances');
        for (const emp of emps) {
            const [b_rows] = await connection.execute('SELECT * FROM leave_balances WHERE employee_id = ?', [emp.employee_id]);
            const b = b_rows[0];
            
            // Ledger entry
            await connection.execute(
                'INSERT INTO ledger (employee_id, transaction_desc, vl_bal, sl_bal, sp_bal, fl_bal, wl_bal, spl_bal, transaction_type, remarks, period_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [emp.employee_id, `Yearly Initialization (${from_year} -> ${to_year}): Balances Forwarded & Privilege Leaves Reset`, b.vacation_leave, b.sick_leave, b.special_leave, b.force_leave, b.wellness_leave, b.solo_parent_leave, 'ROLLOVER', `Yearly Rollover ${from_year} to ${to_year}`, to_year]
            );

            // History Archive entry
            await connection.execute(
                'INSERT INTO yearly_credits_archive (employee_id, year, vl_forwarded, sl_forwarded) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE vl_forwarded = VALUES(vl_forwarded), sl_forwarded = VALUES(sl_forwarded)',
                [emp.employee_id, from_year, b.forwarded_vl, b.forwarded_sl]
            );
        }

        // 4. Record the actions separately in the action logs (as requested)
        await connection.execute(
            'INSERT INTO yearly_action_logs (action_type, year) VALUES (?, ?)',
            ['ROLLOVER', from_year]
        );
        await connection.execute(
            'INSERT INTO yearly_action_logs (action_type, year) VALUES (?, ?)',
            ['PRIVILEGE_RESET', from_year]
        );

        await connection.commit();
        res.json({ success: true, message: `Annual initialization from ${from_year} to ${to_year} completed successfully.` });
    } catch (error) {
        await connection.rollback();
        res.status(400).json({ error: error.message });
    } finally {
        connection.release();
    }
});

app.get('/api/system/audit', async (req, res) => {
    try {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        
        // 1. Check for Pending Accrual of Current Month
        const [accrualLogs] = await db.execute(
            'SELECT * FROM accrual_logs WHERE month = ? AND year = ?',
            [currentMonth, currentYear]
        );
        
        // 2. Check for Pending Rollover of Previous Year (if it's a new year)
        const prevYear = currentYear - 1;
        const [rolloverLogs] = await db.execute(
            'SELECT * FROM yearly_action_logs WHERE action_type = "ROLLOVER" AND year = ?',
            [prevYear]
        );

        res.json({
            pendingAccrual: accrualLogs.length === 0,
            pendingRollover: rolloverLogs.length === 0,
            month: currentMonth,
            year: currentYear,
            prevYear: prevYear
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/leaves/history', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT l.*, e.full_name
            FROM leave_applications l
            JOIN employees e ON l.employee_id = e.id
            WHERE l.status != 'Pending Approval'
            ORDER BY l.applied_at DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. Statistics
app.get('/api/stats', async (req, res) => {
    try {
        const [empCount] = await db.execute('SELECT COUNT(*) as total FROM employees WHERE is_active = 1');
        const [pendingCount] = await db.execute('SELECT COUNT(*) as total FROM leave_applications WHERE status = "Pending Approval"');
        
        res.json({
            totalEmployees: empCount[0].total,
            pendingApproval: pendingCount[0].total
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/ledger/history', async (req, res) => {
    try {
        const { employee_id } = req.query;
        let query = `
            SELECT l.*, e.full_name 
            FROM ledger l 
            JOIN employees e ON l.employee_id = e.id 
            ORDER BY action_date DESC LIMIT 100
        `;
        let params = [];
        if (employee_id) {
            query = `
                SELECT l.*, e.full_name 
                FROM ledger l 
                JOIN employees e ON l.employee_id = e.id 
                WHERE l.employee_id = ?
                ORDER BY action_date DESC
            `;
            params = [employee_id];
        }
        const [rows] = await db.execute(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/employees/:id/yearly-history', async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM yearly_credits_archive WHERE employee_id = ? ORDER BY year DESC',
            [req.params.id]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 6. Leave Card Report API
app.get('/api/employees/:id/leave-card/:year', async (req, res) => {
    const { id, year } = req.params;
    try {
        // 1. Get Employee Info with live balances
        const [empRows] = await db.execute(`
            SELECT e.*, b.special_leave, b.force_leave, b.wellness_leave, b.solo_parent_leave
            FROM employees e
            JOIN leave_balances b ON e.id = b.employee_id
            WHERE e.id = ?
        `, [id]);
        if (empRows.length === 0) return res.status(404).json({ error: 'Employee not found' });
        const employee = empRows[0];

        // 2. Get Starting Balance (Archive from previous year)
        const prevYear = parseInt(year) - 1;
        const [archiveRows] = await db.execute(
            'SELECT * FROM yearly_credits_archive WHERE employee_id = ? AND year = ?',
            [id, prevYear]
        );
        
        let startingBalance = { vl: 0, sl: 0 };
        if (archiveRows.length > 0) {
            startingBalance.vl = parseFloat(archiveRows[0].vl_forwarded);
            startingBalance.sl = parseFloat(archiveRows[0].sl_forwarded);
        } else {
            // Check if there's a registration entry in the ledger before this year
            const [regRows] = await db.execute(
                'SELECT vl_bal, sl_bal FROM ledger WHERE employee_id = ? AND transaction_type = "REGISTRATION" AND YEAR(action_date) <= ? ORDER BY action_date ASC LIMIT 1',
                [id, year]
            );
            if (regRows.length > 0) {
                startingBalance.vl = parseFloat(regRows[0].vl_bal);
                startingBalance.sl = parseFloat(regRows[0].sl_bal);
            }
        }

        // 3. Get Ledger Entries for the Year
        const [ledgerRows] = await db.execute(
            'SELECT * FROM ledger WHERE employee_id = ? AND YEAR(action_date) = ? ORDER BY action_date ASC',
            [id, year]
        );

        // A. Filter for VL/SL Rows (already implemented)
        const vlSlEntries = ledgerRows.filter(entry => {
            const desc = entry.transaction_desc.toLowerCase();
            const type = entry.transaction_type;
            const isSystem = type === 'REGISTRATION' || type === 'ROLLOVER' || 
                             desc.includes('rollover') || desc.includes('registration') || desc.includes('initialization');
            
            const isPrivilege = desc.includes('special leave') || desc.includes('force leave') || 
                                desc.includes('wellness') || desc.includes('solo parent');

            return !isSystem && !isPrivilege;
        });

        // B. Filter for Privilege Rows (NEW)
        const privilegeEntries = ledgerRows.filter(entry => {
            const desc = entry.transaction_desc.toLowerCase();
            return desc.includes('special leave') || desc.includes('force leave') || 
                   desc.includes('wellness') || desc.includes('solo parent');
        });

        let runningBalance = { vl: parseFloat(startingBalance.vl), sl: parseFloat(startingBalance.sl) };

        // PREPEND THE "BALANCE BROUGHT FORWARDED" ROW for VL/SL
        const headerRow = {
            date: `${year}-01-01`,
            period_text: year.toString(),
            particulars: 'BALANCE BROUGHT FORWARDED',
            remarks: '',
            vl: { earned: 0, deduct_w_pay: 0, deduct_wo_pay: 0, balance: runningBalance.vl },
            sl: { earned: 0, deduct_w_pay: 0, deduct_wo_pay: 0, balance: runningBalance.sl }
        };

        const vlSlRows = vlSlEntries.map((entry) => {
            const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
            const actionDate = new Date(entry.action_date);
            const day = actionDate.getDate();
            const month = monthNames[actionDate.getMonth()];

            let row = {
                date: entry.action_date,
                period_text: entry.period_text || '',
                particulars: entry.transaction_desc.replace(/\.000/g, ''),
                remarks: entry.remarks || '',
                vl: { earned: 0, deduct_w_pay: 0, deduct_wo_pay: 0, balance: entry.vl_bal },
                sl: { earned: 0, deduct_w_pay: 0, deduct_wo_pay: 0, balance: entry.sl_bal }
            };

            const vlDiff = parseFloat(entry.vl_bal) - runningBalance.vl;
            const slDiff = parseFloat(entry.sl_bal) - runningBalance.sl;

            if (entry.transaction_type === 'CREDIT' || (vlDiff > 0 && entry.transaction_desc.includes('Accrual'))) {
                // It's an Accrual
                row.period_text = `AS OF ${month}`;
                row.vl.earned = entry.earned || (vlDiff > 0 ? vlDiff : 0);
                row.sl.earned = entry.earned || (slDiff > 0 ? slDiff : 0);
                row.particulars = ''; 
            } else if (entry.transaction_type === 'LEAVE' || (vlDiff < 0 || slDiff < 0)) {
                // It's a Leave
                if (entry.period_text) {
                    row.period_text = entry.period_text;
                } else {
                    const match = entry.transaction_desc.match(/\(([^)]+)\)/);
                    if (match && match[1] && !match[1].includes('1.25')) {
                        row.period_text = match[1].replace(/,$/, '').trim();
                    } else {
                        row.period_text = `${month} ${day}`;
                    }
                }

                if (entry.transaction_type === 'LEAVE') {
                    const totalDays = parseFloat(entry.deducted_with_pay) + parseFloat(entry.deducted_without_pay);
                    row.particulars = `${entry.leave_type} - ${totalDays.toString().replace(/\.0+$/, '')}`;
                    
                    if (entry.leave_type === 'VL') {
                        row.vl.deduct_w_pay = entry.deducted_with_pay;
                        row.vl.deduct_wo_pay = entry.deducted_without_pay;
                    } else if (entry.leave_type === 'SL') {
                        row.sl.deduct_w_pay = entry.deducted_with_pay;
                        row.sl.deduct_wo_pay = entry.deducted_without_pay;
                    }
                } else {
                    // Fallback particulars for legacy leaves
                    if (vlDiff < 0) {
                        row.vl.deduct_w_pay = Math.abs(vlDiff);
                        row.particulars = `VL - ${Math.abs(vlDiff).toString().replace(/\.0+$/, '')}`;
                    } else if (slDiff < 0) {
                        row.sl.deduct_w_pay = Math.abs(slDiff);
                        row.particulars = `SL - ${Math.abs(slDiff).toString().replace(/\.0+$/, '')}`;
                    }
                }
            }

            // Final safety catch for period
            if (!row.period_text || row.period_text.trim() === '') {
                row.period_text = `${month} ${day}`;
            }

            runningBalance.vl = parseFloat(entry.vl_bal);
            runningBalance.sl = parseFloat(entry.sl_bal);

            return row;
        });

        // C. Process Privilege Rows (NEW)
        const privilegeRows = privilegeEntries.map((entry, idx) => {
            const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
            const actionDate = new Date(entry.action_date);
            const day = actionDate.getDate();
            const month = monthNames[actionDate.getMonth()];

            // Smart detection of the amount
            let amount = parseFloat(entry.deducted_with_pay || 0);

            // Calculation from snapshots if deducted_with_pay is 0/null
            if (amount === 0) {
                const types = [
                    { key: 'sp_bal', desc: 'special' },
                    { key: 'fl_bal', desc: 'force' },
                    { key: 'wl_bal', desc: 'wellness' },
                    { key: 'spl_bal', desc: 'solo' }
                ];
                
                for (const t of types) {
                    if (entry.transaction_desc.toLowerCase().includes(t.desc)) {
                        // For the first entry, we compare against the default allocation (3, 5, 5, 7)
                        const defaultCaps = { 'sp_bal': 3, 'fl_bal': 5, 'wl_bal': 5, 'spl_bal': 7 };
                        const prevBal = idx > 0 ? parseFloat(privilegeEntries[idx - 1][t.key]) : defaultCaps[t.key];
                        const diff = prevBal - parseFloat(entry[t.key]);
                        if (diff !== 0) amount = diff;
                        break;
                    }
                }
            }

            // Clean up particulars
            let particulars = entry.transaction_desc.split('(')[0].replace('Leave Approved:', '').replace('UNDO APPROVAL:', 'RESTORED:').trim();

            return {
                period_text: entry.period_text || `${month} ${day}`,
                particulars: particulars,
                absence_w_pay: Math.abs(amount), // Always display as positive withdrawal
                remarks: entry.remarks || ''
            };
        });

        res.json({
            employee: empRows[0],
            startingBalance,
            rows: [headerRow, ...vlSlRows],
            privilegeRows: privilegeRows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
