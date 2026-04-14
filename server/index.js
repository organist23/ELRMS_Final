const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

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
            'INSERT INTO ledger (employee_id, transaction_desc, vl_bal, sl_bal, sp_bal, fl_bal, wl_bal, spl_bal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, 'First Registration: Initial Balance Set', initial_vl || 0, initial_sl || 0, 3, 5, 5, 7]
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
    const { full_name, civil_status, gsis_policy, position, entrance_of_duty, tin, status, office } = req.body;
    try {
        await db.execute(
            'UPDATE employees SET full_name=?, civil_status=?, gsis_policy=?, position=?, entrance_of_duty=?, tin=?, status=?, office=? WHERE id=?',
            [full_name, civil_status, gsis_policy, position, entrance_of_duty, tin, status, office, req.params.id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/employees/:id', async (req, res) => {
    try {
        await db.execute('UPDATE employees SET is_active = 0 WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
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

        if (limits[leave_type] && num_days > balance[leave_type.toLowerCase().replace(' ', '_')]) {
             return res.status(400).json({ error: `Not enough credits in ${leave_type}. Remaining: ${balance[leave_type.toLowerCase().replace(' ', '_')]}` });
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
        let with_pay = 0;
        let without_pay = 0;

        if (app_data.num_days > bal[field]) {
            with_pay = bal[field];
            without_pay = app_data.num_days - bal[field];
        } else {
            with_pay = app_data.num_days;
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

        const desc = `Leave Approved: ${app_data.leave_type} (${app_data.inclusive_dates}). Status: ${with_pay} Paid, ${without_pay} Without Pay.`;

        await connection.execute(
            'INSERT INTO ledger (employee_id, transaction_desc, vl_bal, sl_bal, sp_bal, fl_bal, wl_bal, spl_bal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [app_data.employee_id, desc, b.vacation_leave, b.sick_leave, b.special_leave, b.force_leave, b.wellness_leave, b.solo_parent_leave]
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
            await connection.execute(
                'INSERT INTO ledger (employee_id, transaction_desc, vl_bal, sl_bal, sp_bal, fl_bal, wl_bal, spl_bal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [emp.employee_id, `Monthly Accrual: ${month}/${year} (+1.25 VL/SL)`, b.vacation_leave, b.sick_leave, b.special_leave, b.force_leave, b.wellness_leave, b.solo_parent_leave]
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

app.post('/api/accrual/reset-privileges', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        await connection.execute('UPDATE leave_balances SET special_leave = 3.000, force_leave = 5.000, wellness_leave = 5.000, solo_parent_leave = 7.000');
        
        const [emps] = await connection.execute('SELECT employee_id FROM leave_balances');
        for (const emp of emps) {
             const [b_rows] = await connection.execute('SELECT * FROM leave_balances WHERE employee_id = ?', [emp.employee_id]);
             const b = b_rows[0];
             await connection.execute(
                'INSERT INTO ledger (employee_id, transaction_desc, vl_bal, sl_bal, sp_bal, fl_bal, wl_bal, spl_bal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [emp.employee_id, `Manual Reset: Privilege Leaves restored to defaults`, b.vacation_leave, b.sick_leave, b.special_leave, b.force_leave, b.wellness_leave, b.solo_parent_leave]
            );
        }

        await connection.commit();
        res.json({ success: true, message: 'All privilege leaves reset to defaults' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

app.post('/api/accrual/rollover', async (req, res) => {
    const { from_year, to_year } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Move current VL/SL to Forwarded columns
        await connection.execute('UPDATE leave_balances SET forwarded_vl = vacation_leave, forwarded_sl = sick_leave');

        // 2. Log in ledger for all
        const [emps] = await connection.execute('SELECT employee_id FROM leave_balances');
        for (const emp of emps) {
            const [b_rows] = await connection.execute('SELECT * FROM leave_balances WHERE employee_id = ?', [emp.employee_id]);
            const b = b_rows[0];
            await connection.execute(
                'INSERT INTO ledger (employee_id, transaction_desc, vl_bal, sl_bal, sp_bal, fl_bal, wl_bal, spl_bal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [emp.employee_id, `Yearly Rollover (${from_year} -> ${to_year}): Balances Forwarded`, b.vacation_leave, b.sick_leave, b.special_leave, b.force_leave, b.wellness_leave, b.solo_parent_leave]
            );
        }

        await connection.commit();
        res.json({ success: true, message: `Successfully rolled over to ${to_year}` });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
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
        const [activeCount] = await db.execute('SELECT COUNT(DISTINCT employee_id) as total FROM leave_applications WHERE status = "Approved" AND CURDATE() BETWEEN date_from AND date_to');
        
        res.json({
            totalEmployees: empCount[0].total,
            pendingApproval: pendingCount[0].total,
            activeOnLeave: activeCount[0].total
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
