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

        const current_bal = parseFloat(balance[leave_type.toLowerCase().replace(' ', '_')]);
        if (limits[leave_type] && parseFloat(num_days) > current_bal) {
             return res.status(400).json({ error: `Not enough credits in ${leave_type}. Remaining: ${current_bal.toFixed(3)}` });
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

        const desc = `Leave Approved: ${app_data.leave_type} (${app_data.inclusive_dates}). Status: ${with_pay.toFixed(3)} Paid, ${without_pay.toFixed(3)} Without Pay.`;

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
                'INSERT INTO ledger (employee_id, transaction_desc, vl_bal, sl_bal, sp_bal, fl_bal, wl_bal, spl_bal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [emp.employee_id, `Yearly Initialization (${from_year} -> ${to_year}): Balances Forwarded & Privilege Leaves Reset`, b.vacation_leave, b.sick_leave, b.special_leave, b.force_leave, b.wellness_leave, b.solo_parent_leave]
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
