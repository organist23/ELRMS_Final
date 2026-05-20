const express = require('express');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcrypt');
const mysqldump = require('mysqldump');
const SALT_ROUNDS = 10;

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const LEAVE_TYPES = {
    SPECIAL: 'Special Leave',
    FORCE: 'Force Leave',
    WELLNESS: 'Wellness Leave',
    SOLO_PARENT: 'Solo Parent Leave',
    MATERNITY: 'Maternity Leave',
    PATERNITY: 'Paternity Leave',
    SBW: 'Special Benefits for Women'
};

// --- AUTO-MIGRATION: Hash plain text passwords on startup ---
async function migratePasswords() {
    try {
        const [users] = await db.execute('SELECT id, password FROM admin_users');
        for (const user of users) {
            const alreadyHashed = user.password && user.password.startsWith('$2b$');
            if (!alreadyHashed) {
                const hashed = await bcrypt.hash(user.password, SALT_ROUNDS);
                await db.execute('UPDATE admin_users SET password = ? WHERE id = ?', [hashed, user.id]);
                console.log(`[Security] Migrated password for user ID: ${user.id}`);
            }
        }
    } catch (err) {
        console.error('[Security] Password migration failed:', err.message);
    }
}
migratePasswords();

// --- ROUTES ---

// 1. Authentication
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        // 1. Find user by username only (never compare plain text)
        const [users] = await db.execute('SELECT * FROM admin_users WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
        // 2. Compare typed password against stored hash
        const isMatch = await bcrypt.compare(password, users[0].password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
        res.json({ success: true, user: { username: users[0].username } });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reset Password (Forgot Password)
app.put('/api/auth/reset-password', async (req, res) => {
    const { username, newPassword } = req.body;
    try {
        const [users] = await db.execute('SELECT * FROM admin_users WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'Username not found.' });
        }
        // Hash the new password before saving
        const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await db.execute('UPDATE admin_users SET password = ? WHERE username = ?', [hashed, username]);
        res.json({ success: true, message: 'Password updated successfully.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Employees CRUD
app.get('/api/employees', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE e.is_active = 1';
        let params = [];

        if (search) {
            whereClause += ' AND (e.full_name LIKE ? OR e.id LIKE ? OR e.position LIKE ? OR e.office LIKE ? OR e.status LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        // 1. Get Total Count for Pagination (Using LEFT JOIN to match data query)
        const [countRows] = await db.execute(`
            SELECT COUNT(*) as total 
            FROM employees e 
            LEFT JOIN leave_balances b ON e.id = b.employee_id
            ${whereClause}
        `, params);
        const total = countRows[0].total;

        // 2. Get Paginated Data
        const [rows] = await db.execute(`
            SELECT e.*, b.vacation_leave, b.sick_leave, b.special_leave, b.force_leave, b.wellness_leave, b.solo_parent_leave, b.maternity_leave, b.paternity_leave, b.special_benefits_for_women, b.bbw_vl, b.bbw_sl, b.forwarded_vl, b.forwarded_sl
            FROM employees e
            LEFT JOIN leave_balances b ON e.id = b.employee_id
            ${whereClause}
            ORDER BY e.full_name ASC
            LIMIT ${limit} OFFSET ${offset}
        `, params);

        res.json({
            data: rows,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/employees', async (req, res) => {
    const { id, full_name, sex, civil_status, gsis_policy, position, entrance_of_duty, tin, status, office, initial_vl, initial_sl } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        await connection.execute(
            'INSERT INTO employees (id, full_name, sex, civil_status, gsis_policy, position, entrance_of_duty, tin, status, office) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, full_name, sex, civil_status, gsis_policy, position, entrance_of_duty, tin, status, office]
        );

        await connection.execute(
            'INSERT INTO leave_balances (employee_id, vacation_leave, sick_leave, bbw_vl, bbw_sl, forwarded_vl, forwarded_sl, special_benefits_for_women, paternity_leave) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, initial_vl || 0, initial_sl || 0, initial_vl || 0, initial_sl || 0, initial_vl || 0, initial_sl || 0, 30, sex === 'Male' ? 7 : 0]
        );

        await connection.execute(
            'INSERT INTO ledger (employee_id, transaction_desc, vl_bal, sl_bal, sp_bal, fl_bal, wl_bal, spl_bal, mat_bal, pat_bal, sbw_bal, transaction_type, remarks, period_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, 'First Registration: Initial Balance Set', initial_vl || 0, initial_sl || 0, 3, 5, 5, 7, 105, 7, 30, 'REGISTRATION', 'Initial Balance', new Date().getFullYear()]
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
    const { full_name, sex, civil_status, gsis_policy, position, entrance_of_duty, tin, status, office, vacation_leave, sick_leave } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get old balances for comparison
        const [old] = await connection.execute('SELECT * FROM leave_balances WHERE employee_id = ? FOR UPDATE', [req.params.id]);
        if (old.length === 0) throw new Error('Employee not found');
        
        const old_vl = old[0]?.vacation_leave || 0;
        const old_sl = old[0]?.sick_leave || 0;

        // Validation: Prevent negative balances
        if (parseFloat(vacation_leave) < 0 || parseFloat(sick_leave) < 0) {
            throw new Error('Balances cannot be negative.');
        }

        // 2. Update credentials
        await connection.execute(
            'UPDATE employees SET full_name=?, sex=?, civil_status=?, gsis_policy=?, position=?, entrance_of_duty=?, tin=?, status=?, office=? WHERE id=?',
            [full_name, sex, civil_status, gsis_policy, position, entrance_of_duty, tin, status, office, req.params.id]
        );

        // 3. Update balances (VL and SL only)
        await connection.execute(
            'UPDATE leave_balances SET vacation_leave = ?, sick_leave = ? WHERE employee_id = ?',
            [vacation_leave, sick_leave, req.params.id]
        );

        // 4. Ledger entry if balances changed
        if (Math.abs(parseFloat(old_vl) - parseFloat(vacation_leave)) > 0.0001 || Math.abs(parseFloat(old_sl) - parseFloat(sick_leave)) > 0.0001) {
            const [b_rows] = await connection.execute('SELECT * FROM leave_balances WHERE employee_id = ?', [req.params.id]);
            const b = b_rows[0];
            const desc = `Manual Update: ${full_name}'s balances adjusted by Admin. (Old VL: ${parseFloat(old_vl).toFixed(3)}, Old SL: ${parseFloat(old_sl).toFixed(3)})`;
            
            let updatedTypes = [];
            if (Math.abs(parseFloat(old_vl) - parseFloat(vacation_leave)) > 0.0001) updatedTypes.push('VL');
            if (Math.abs(parseFloat(old_sl) - parseFloat(sick_leave)) > 0.0001) updatedTypes.push('SL');
            const leaveTypeLabel = updatedTypes.join('/') || 'ADJUSTMENT';

            await connection.execute(
                'INSERT INTO ledger (employee_id, transaction_desc, vl_bal, sl_bal, sp_bal, fl_bal, wl_bal, spl_bal, mat_bal, pat_bal, sbw_bal, transaction_type, leave_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [req.params.id, desc, b.vacation_leave, b.sick_leave, b.special_leave, b.force_leave, b.wellness_leave, b.solo_parent_leave, b.maternity_leave, b.paternity_leave, b.special_benefits_for_women, 'MANUAL', leaveTypeLabel]
            );
        }

        await connection.commit();
        res.json({ success: true, message: 'Employee and balances updated' });
    } catch (error) {
        await connection.rollback();
        console.error('Update Error:', error.message);
        res.status(400).json({ error: error.message });
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
            'INSERT INTO ledger (employee_id, transaction_desc, vl_bal, sl_bal, sp_bal, fl_bal, wl_bal, spl_bal, mat_bal, pat_bal, sbw_bal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [req.params.id, 'Account Archived: Employee moved to inactive records.', b.vacation_leave, b.sick_leave, b.special_leave, b.force_leave, b.wellness_leave, b.solo_parent_leave, b.maternity_leave, b.paternity_leave, b.special_benefits_for_women]
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

        if (clean_from && clean_to && new Date(clean_to) < new Date(clean_from)) {
            return res.status(400).json({ error: 'Invalid Date Range: "Date To" cannot be earlier than "Date From".' });
        }

        // Validation check for privileges
        const [balanceRows] = await db.execute('SELECT * FROM leave_balances WHERE employee_id = ?', [employee_id]);
        if (balanceRows.length === 0) return res.status(404).json({ error: 'Employee balance not found' });
        
        const balance = balanceRows[0];
        const limits = {
            [LEAVE_TYPES.SPECIAL]: 3,
            [LEAVE_TYPES.FORCE]: 5,
            [LEAVE_TYPES.WELLNESS]: 5,
            [LEAVE_TYPES.SOLO_PARENT]: 7,
            [LEAVE_TYPES.MATERNITY]: 105,
            [LEAVE_TYPES.PATERNITY]: 7,
            [LEAVE_TYPES.SBW]: 30
        };

        const field_map = {
            [LEAVE_TYPES.SPECIAL]: 'special_leave',
            [LEAVE_TYPES.FORCE]: 'force_leave',
            [LEAVE_TYPES.WELLNESS]: 'wellness_leave',
            [LEAVE_TYPES.SOLO_PARENT]: 'solo_parent_leave',
            [LEAVE_TYPES.MATERNITY]: 'maternity_leave',
            [LEAVE_TYPES.PATERNITY]: 'paternity_leave',
            [LEAVE_TYPES.SBW]: 'special_benefits_for_women'
        };

        if (limits[leave_type]) {
            const field = field_map[leave_type];
            const current_bal = parseFloat(balance[field]);
            if (parseFloat(num_days) > current_bal) {
                 return res.status(400).json({ error: `Not enough credits in ${leave_type}. Remaining: ${current_bal.toFixed(3)}` });
            }
        }

        await db.execute(
            'INSERT INTO leave_applications (employee_id, leave_type, date_from, date_to, num_days, inclusive_dates, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [employee_id, leave_type, clean_from, clean_to, num_days, inclusive_dates, reason, 'Pending Approval']
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
            'Solo Parent Leave': 'solo_parent_leave',
            'Maternity Leave': 'maternity_leave',
            'Paternity Leave': 'paternity_leave',
            'Special Benefits for Women': 'special_benefits_for_women'
        };
        const field = field_map[app_data.leave_type];
        
        // --- Split Pay Math ---
        // ADDED 'FOR UPDATE' TO PREVENT RACE CONDITIONS
        const [balances] = await connection.execute('SELECT * FROM leave_balances WHERE employee_id = ? FOR UPDATE', [app_data.employee_id]);
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
            'INSERT INTO ledger (employee_id, transaction_desc, vl_bal, sl_bal, sp_bal, fl_bal, wl_bal, spl_bal, mat_bal, pat_bal, sbw_bal, transaction_type, leave_type, deducted_with_pay, deducted_without_pay, remarks, period_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [app_data.employee_id, desc, b.vacation_leave, b.sick_leave, b.special_leave, b.force_leave, b.wellness_leave, b.solo_parent_leave, b.maternity_leave, b.paternity_leave, b.special_benefits_for_women, 'LEAVE', leave_type_short, with_pay, without_pay, app_data.reason, app_data.inclusive_dates]
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

        // Check if the leave application belongs to a closed month (accrual already generated)
        const leaveDate = app_data.date_to ? new Date(app_data.date_to) : new Date(app_data.applied_at);
        const leaveMonth = leaveDate.getMonth() + 1;
        const leaveYear = leaveDate.getFullYear();

        const [accrualLogs] = await connection.execute(
            'SELECT * FROM accrual_logs WHERE month = ? AND year = ?',
            [leaveMonth, leaveYear]
        );

        if (accrualLogs.length > 0) {
            throw new Error(`Undo Locked: This leave application belongs to a closed month (${leaveMonth}/${leaveYear}). To correct credits, please perform a Manual Balance Adjustment.`);
        }

        const field_map = {
            'Vacation Leave': 'vacation_leave',
            'Sick Leave': 'sick_leave',
            'Special Leave': 'special_leave',
            'Force Leave': 'force_leave',
            'Wellness Leave': 'wellness_leave',
            'Solo Parent Leave': 'solo_parent_leave',
            'Maternity Leave': 'maternity_leave',
            'Paternity Leave': 'paternity_leave',
            'Special Benefits for Women': 'special_benefits_for_women'
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

        // Build short leave type code consistently with the Approval logic
        const leaveTypeCode = app_data.leave_type === 'Vacation Leave' ? 'VL' : (app_data.leave_type === 'Sick Leave' ? 'SL' : app_data.leave_type);
        const restoredDays = parseFloat(app_data.with_pay);

        await connection.execute(
            'INSERT INTO ledger (employee_id, transaction_desc, vl_bal, sl_bal, sp_bal, fl_bal, wl_bal, spl_bal, mat_bal, pat_bal, sbw_bal, transaction_type, leave_type, deducted_with_pay, period_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [app_data.employee_id, `UNDO APPROVAL: Restored ${restoredDays} days to ${app_data.leave_type}`, b.vacation_leave, b.sick_leave, b.special_leave, b.force_leave, b.wellness_leave, b.solo_parent_leave, b.maternity_leave, b.paternity_leave, b.special_benefits_for_women, 'UNDO', leaveTypeCode, restoredDays, app_data.inclusive_dates || null]
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
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [apps] = await connection.execute('SELECT * FROM leave_applications WHERE id = ?', [application_id]);
        if (apps.length === 0) throw new Error('Application not found');
        const app_data = apps[0];

        if (app_data.leave_type === LEAVE_TYPES.FORCE) {
            // === FORCE LEAVE SPECIAL CASE: Exigency of Service ===
            // Rejected Force Leave days are transferred to Vacation Leave
            const transferDays = parseFloat(app_data.num_days || 0);

            // 1. Deduct from force_leave balance, credit to vacation_leave
            await connection.execute(
                'UPDATE leave_balances SET force_leave = force_leave - ?, vacation_leave = vacation_leave + ? WHERE employee_id = ?',
                [transferDays, transferDays, app_data.employee_id]
            );

            // 2. Reject the application
            await connection.execute('UPDATE leave_applications SET status = "Rejected" WHERE id = ?', [application_id]);

            // 3. Take a fresh snapshot of all balances after the update
            const [new_bal] = await connection.execute('SELECT * FROM leave_balances WHERE employee_id = ?', [app_data.employee_id]);
            const b = new_bal[0];

            // 4. DOUBLE ENTRY LEDGER SYSTEM:
            
            // ENTRY A: Updates the VL Card (The "Credit")
            // Routes to VL Card via leave_type='VL'. Shows as "Earned" via balance diff.
            await connection.execute(
                'INSERT INTO ledger (employee_id, transaction_desc, vl_bal, sl_bal, sp_bal, fl_bal, wl_bal, spl_bal, mat_bal, pat_bal, sbw_bal, transaction_type, leave_type, earned, remarks, period_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    app_data.employee_id,
                    'VL Transfer (Force Leave Rejected)',
                    b.vacation_leave, b.sick_leave, b.special_leave, b.force_leave, b.wellness_leave, b.solo_parent_leave, b.maternity_leave, b.paternity_leave, b.special_benefits_for_women,
                    'TRANSFER',
                    'VL',
                    transferDays,
                    'Exigency of Service: Force Leave transferred to VL',
                    app_data.inclusive_dates || null
                ]
            );

            // ENTRY B: Updates the Privilege Card (The "Debit")
            // Routes to Privilege Card via leave_type='Force Leave'. Shows as "Absence w/ Pay" via balance diff.
            await connection.execute(
                'INSERT INTO ledger (employee_id, transaction_desc, vl_bal, sl_bal, sp_bal, fl_bal, wl_bal, spl_bal, mat_bal, pat_bal, sbw_bal, transaction_type, leave_type, earned, remarks, period_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    app_data.employee_id,
                    'VL Transfer (Force Leave Rejected)',
                    b.vacation_leave, b.sick_leave, b.special_leave, b.force_leave, b.wellness_leave, b.solo_parent_leave, b.maternity_leave, b.paternity_leave, b.special_benefits_for_women,
                    'TRANSFER',
                    LEAVE_TYPES.FORCE,
                    0,
                    'Exigency of Service: Transferred to VL',
                    app_data.inclusive_dates || null
                ]
            );
        } else {
            // === STANDARD REJECTION: No balance changes, simple status update ===
            await connection.execute('UPDATE leave_applications SET status = "Rejected" WHERE id = ?', [application_id]);
        }

        await connection.commit();
        res.json({ success: true });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
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

        // 2. CHECK: Yearly Rollover for previous year must be completed (If legacy employees exist)
        const prevYear = parseInt(year) - 1;
        const [rolloverCheck] = await connection.execute(
            'SELECT * FROM yearly_action_logs WHERE action_type = "ROLLOVER" AND year = ?',
            [prevYear]
        );
        
        const [legacyCheck] = await connection.execute(
            'SELECT * FROM employees WHERE YEAR(created_at) < ? AND is_active = 1 LIMIT 1',
            [year]
        );

        if (legacyCheck.length > 0 && rolloverCheck.length === 0) {
            throw new Error(`Cannot generate credits for ${year}. The Yearly Rollover for ${prevYear} is still pending because legacy employees exist.`);
        }

        // 2. Add 1.25 to all active employees
        await connection.execute(`
            UPDATE leave_balances lb
            JOIN employees e ON lb.employee_id = e.id
            SET lb.vacation_leave = lb.vacation_leave + 1.25, 
                lb.sick_leave = lb.sick_leave + 1.25
            WHERE e.is_active = 1
        `);

        // 3. Log into accrual_logs
        await connection.execute('INSERT INTO accrual_logs (month, year) VALUES (?, ?)', [month, year]);

        // 4. PREPARE & EXECUTE BULK LEDGER INSERT
        const [balances] = await connection.execute(`
            SELECT lb.* 
            FROM leave_balances lb
            JOIN employees e ON lb.employee_id = e.id
            WHERE e.is_active = 1
        `);

        if (balances.length > 0) {
            const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
            const periodText = `AS OF ${monthNames[month - 1]}`;
            
            const ledgerRows = balances.map(b => [
                b.employee_id, 
                `Monthly Accrual: ${month}/${year} (+1.25 VL/SL)`, 
                b.vacation_leave, b.sick_leave, b.special_leave, b.force_leave, b.wellness_leave, b.solo_parent_leave, b.maternity_leave, b.paternity_leave, b.special_benefits_for_women,
                'CREDIT', 1.25, 'Monthly Credit', periodText
            ]);

            await connection.query(
                'INSERT INTO ledger (employee_id, transaction_desc, vl_bal, sl_bal, sp_bal, fl_bal, wl_bal, spl_bal, mat_bal, pat_bal, sbw_bal, transaction_type, earned, remarks, period_text) VALUES ?',
                [ledgerRows]
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

        // 2. Perform Dual Action: Move current VL/SL to Forwarded AND Reset Privileges to defaults (ACTIVE ONLY)
        await connection.execute(`
            UPDATE leave_balances lb
            JOIN employees e ON lb.employee_id = e.id
            SET lb.forwarded_vl = lb.vacation_leave, 
                lb.forwarded_sl = lb.sick_leave,
                lb.special_leave = 3.000, 
                lb.force_leave = 5.000, 
                lb.wellness_leave = 5.000, 
                lb.solo_parent_leave = 7.000,
                lb.maternity_leave = 105.000,
                lb.paternity_leave = (CASE WHEN e.sex = 'Male' THEN 7.000 ELSE 0.000 END),
                lb.special_benefits_for_women = 30.000
            WHERE e.is_active = 1
        `);

        // 3. PREPARE & EXECUTE BULK LEDGER & ARCHIVE INSERTS
        const [balances] = await connection.execute(`
            SELECT lb.* 
            FROM leave_balances lb
            JOIN employees e ON lb.employee_id = e.id
            WHERE e.is_active = 1
        `);

        if (balances.length > 0) {
            // A. Bulk Ledger Rows
            const ledgerRows = balances.map(b => [
                b.employee_id, 
                `Yearly Initialization (${from_year} -> ${to_year}): Balances Forwarded & Privilege Leaves Reset`, 
                b.vacation_leave, b.sick_leave, b.special_leave, b.force_leave, b.wellness_leave, b.solo_parent_leave, b.maternity_leave, b.paternity_leave, b.special_benefits_for_women,
                'ROLLOVER', 0, `Yearly Rollover ${from_year} to ${to_year}`, to_year.toString()
            ]);

            await connection.query(
                'INSERT INTO ledger (employee_id, transaction_desc, vl_bal, sl_bal, sp_bal, fl_bal, wl_bal, spl_bal, mat_bal, pat_bal, sbw_bal, transaction_type, earned, remarks, period_text) VALUES ?',
                [ledgerRows]
            );

            // B. Bulk Yearly Credits Archive Rows (Using ON DUPLICATE KEY logic)
            const archiveRows = balances.map(b => [
                b.employee_id, 
                from_year, 
                b.forwarded_vl, 
                b.forwarded_sl
            ]);

            await connection.query(
                'INSERT INTO yearly_credits_archive (employee_id, year, vl_forwarded, sl_forwarded) VALUES ? ON DUPLICATE KEY UPDATE vl_forwarded = VALUES(vl_forwarded), sl_forwarded = VALUES(sl_forwarded)',
                [archiveRows]
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

        // 3. SMART CHECK: Only require rollover if there are employees from previous years
        const [legacyEmployees] = await db.execute(
            'SELECT * FROM employees WHERE YEAR(created_at) < ? AND is_active = 1 LIMIT 1',
            [currentYear]
        );
        
        // Rollover is only pending if legacy employees exist AND no rollover log is found
        const isRolloverPending = legacyEmployees.length > 0 && rolloverLogs.length === 0;

        res.json({
            pendingAccrual: accrualLogs.length === 0,
            pendingRollover: isRolloverPending,
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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const [countRows] = await db.execute(`
            SELECT COUNT(*) as total 
            FROM leave_applications l
            WHERE l.status != 'Pending Approval'
        `);
        const total = countRows[0].total;

        const [rows] = await db.execute(`
            SELECT l.*, e.full_name,
                   (SELECT COUNT(*) FROM accrual_logs a WHERE a.month = MONTH(COALESCE(l.date_to, l.applied_at)) AND a.year = YEAR(COALESCE(l.date_to, l.applied_at))) > 0 AS is_closed
            FROM leave_applications l
            JOIN employees e ON l.employee_id = e.id
            WHERE l.status != 'Pending Approval'
            ORDER BY l.applied_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `);

        res.json({
            data: rows,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
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
        const { employee_id, search, startDate, endDate } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20; // Improved pagination limit: 20 per page!
        const offset = (page - 1) * limit;

        let conditions = [];
        let params = [];

        if (employee_id) {
            conditions.push(`l.employee_id = ?`);
            params.push(employee_id);
        }

        if (search) {
            conditions.push(`(e.full_name LIKE ? OR l.employee_id LIKE ? OR l.transaction_desc LIKE ?)`);
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        if (startDate) {
            conditions.push(`l.action_date >= ?`);
            params.push(startDate);
        }

        if (endDate) {
            conditions.push(`l.action_date <= ?`);
            params.push(`${endDate} 23:59:59`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM ledger l
            JOIN employees e ON l.employee_id = e.id
            ${whereClause}
        `;
        const [countRows] = await db.execute(countQuery, params);
        const total = countRows[0].total;

        // Get paginated data
        const query = `
            SELECT l.*, e.full_name 
            FROM ledger l 
            JOIN employees e ON l.employee_id = e.id 
            ${whereClause}
            ORDER BY l.action_date DESC, l.id DESC
            LIMIT ${limit} OFFSET ${offset}
        `;
        const [rows] = await db.execute(query, params);

        res.json({
            data: rows,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Ledger History Error:', error);
        res.status(500).json({ error: 'Failed to fetch ledger history' });
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
            SELECT e.*, b.special_leave, b.force_leave, b.wellness_leave, b.solo_parent_leave, b.maternity_leave, b.paternity_leave, b.special_benefits_for_women, b.bbw_vl, b.bbw_sl
            FROM employees e
            JOIN leave_balances b ON e.id = b.employee_id
            WHERE e.id = ?
        `, [id]);
        if (empRows.length === 0) return res.status(404).json({ error: 'Employee not found' });
        const employee = empRows[0];

        // 2. Get Starting Balance (Archive from previous year)
        const prevYear = parseInt(year) - 1;
        const regYear = new Date(employee.created_at).getFullYear();

        const [archiveRows] = await db.execute(
            'SELECT * FROM yearly_credits_archive WHERE employee_id = ? AND year = ?',
            [id, prevYear]
        );
        
        let startingBalance = { vl: 0, sl: 0 };
        let cutoffLedgerId = -1; // Ignore entries with ID <= cutoffLedgerId

        if (archiveRows.length > 0 && regYear <= prevYear) {
            // Case 1: Existing employee with a previous year archive
            startingBalance.vl = parseFloat(archiveRows[0].vl_forwarded);
            startingBalance.sl = parseFloat(archiveRows[0].sl_forwarded);
            cutoffLedgerId = -1; // Archive is from prev year, so all ledger entries this year are relevant
        } else {
            // Check for Registration in this specific year - HIGH PRIORITY for new employees
            const [regRows] = await db.execute(
                `SELECT * FROM ledger WHERE employee_id = ? AND YEAR(action_date) = ? AND transaction_type = 'REGISTRATION' ORDER BY action_date ASC LIMIT 1`,
                [id, year]
            );

            if (regRows.length > 0) {
                // Case 2: Newly registered employee - start from their initial balance
                startingBalance.vl = parseFloat(regRows[0].vl_bal);
                startingBalance.sl = parseFloat(regRows[0].sl_bal);
                cutoffLedgerId = regRows[0].id;
            } else {
                // Case 3: Check for ROLLOVER entry for this year (fallback for missing archive)
                const [rolloverRows] = await db.execute(
                    `SELECT * FROM ledger WHERE employee_id = ? AND YEAR(action_date) = ? AND transaction_type = 'ROLLOVER' ORDER BY action_date ASC LIMIT 1`,
                    [id, year]
                );
                
                if (rolloverRows.length > 0) {
                    startingBalance.vl = parseFloat(rolloverRows[0].vl_bal);
                    startingBalance.sl = parseFloat(rolloverRows[0].sl_bal);
                    cutoffLedgerId = rolloverRows[0].id;
                } else {
                    // Case 4: Complete fresh start from base balances
                    startingBalance.vl = parseFloat(employee.bbw_vl || 0);
                    startingBalance.sl = parseFloat(employee.bbw_sl || 0);
                    cutoffLedgerId = -1;
                }
            }
        }

        // 3. Get Ledger Entries for the Year
        const [ledgerRows] = await db.execute(
            'SELECT * FROM ledger WHERE employee_id = ? AND YEAR(action_date) = ? ORDER BY action_date ASC',
            [id, year]
        );

        // A. Filter for VL/SL Rows (IMPROVED: DATA-FIRST APPROACH)
        const vlSlEntries = ledgerRows.filter(entry => {
            // Skip entries that were already part of the starting balance calculation
            if (entry.id <= cutoffLedgerId) return false;

            const type = entry.transaction_type;
            const leaveType = entry.leave_type || ''; // Metadata column
            const desc = (entry.transaction_desc || '').toLowerCase(); // Fallback description
            
            // Registration and Rollover entries are system entries
            const isSystem = type === 'REGISTRATION' || type === 'ROLLOVER';
            
            // Check if it's a privilege leave using the reliable leave_type column
            // Fallback to string matching for older records
            const isPrivilege = [LEAVE_TYPES.SPECIAL, LEAVE_TYPES.FORCE, LEAVE_TYPES.WELLNESS, LEAVE_TYPES.SOLO_PARENT, LEAVE_TYPES.MATERNITY, LEAVE_TYPES.PATERNITY, LEAVE_TYPES.SBW].includes(leaveType) ||
                                (leaveType === '' && (desc.includes('special leave') || desc.includes('force leave') || desc.includes('paternity') || desc.includes('wellness') || desc.includes('solo parent') || desc.includes('maternity') || desc.includes('special benefits for women') || desc.includes('special benefits for woman')));

            return !isSystem && !isPrivilege;
        });

        // B. Filter for Privilege Rows (IMPROVED: DATA-FIRST APPROACH)
        const privilegeEntries = ledgerRows.filter(entry => {
            const leaveType = entry.leave_type || '';
            const desc = (entry.transaction_desc || '').toLowerCase();
            
            return [LEAVE_TYPES.SPECIAL, LEAVE_TYPES.FORCE, LEAVE_TYPES.WELLNESS, LEAVE_TYPES.SOLO_PARENT, LEAVE_TYPES.MATERNITY, LEAVE_TYPES.PATERNITY, LEAVE_TYPES.SBW].includes(leaveType) ||
                   (leaveType === '' && (desc.includes('special leave') || desc.includes('force leave') || desc.includes('paternity') || desc.includes('wellness') || desc.includes('solo parent') || desc.includes('maternity') || desc.includes('special benefits for women') || desc.includes('special benefits for woman')));
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
                particulars: '',
                remarks: entry.remarks || '',
                vl: { earned: 0, deduct_w_pay: 0, deduct_wo_pay: 0, balance: 0 },
                sl: { earned: 0, deduct_w_pay: 0, deduct_wo_pay: 0, balance: 0 }
            };

            if (entry.transaction_type === 'CREDIT') {
                // Monthly Credit: Add earned to BOTH VL and SL
                const baseEarned = parseFloat(entry.earned || 1.25);
                runningBalance.vl += baseEarned;
                runningBalance.sl += baseEarned;
                row.vl.earned = baseEarned;
                row.sl.earned = baseEarned;
                row.period_text = `AS OF ${month}`;
                row.particulars = 'Monthly Credit';

            } else if (entry.transaction_type === 'LEAVE' || entry.transaction_type === 'TARDY') {
                // Leave Deduction OR Tardy Deduction: always deducts from VL when leave_type = 'VL'
                const deductWPay = parseFloat(entry.deducted_with_pay || 0);
                const deductWOPay = parseFloat(entry.deducted_without_pay || 0);
                const totalDays = deductWPay + deductWOPay;

                if (entry.leave_type === 'VL') {
                    runningBalance.vl -= deductWPay;
                    row.vl.deduct_w_pay = deductWPay;
                    row.vl.deduct_wo_pay = deductWOPay;
                } else if (entry.leave_type === 'SL') {
                    runningBalance.sl -= deductWPay;
                    row.sl.deduct_w_pay = deductWPay;
                    row.sl.deduct_wo_pay = deductWOPay;
                }

                // Safety: Ensure balance never displays as negative in the calculator
                if (runningBalance.vl < 0) runningBalance.vl = 0;
                if (runningBalance.sl < 0) runningBalance.sl = 0;

                row.period_text = entry.period_text || `${month} ${day}`;
                // Tardy gets a distinct label; regular leave keeps the existing format
                if (entry.transaction_type === 'TARDY') {
                    row.particulars = `TARDY - ${parseFloat(deductWPay.toFixed(3))} Deducted`;
                } else {
                    row.particulars = `${entry.leave_type} - ${parseFloat(totalDays.toFixed(3))}`;
                }

            } else if (entry.transaction_type === 'UNDO') {
                // UNDO: Restore the deducted days back to the correct leave type
                const restoredDays = parseFloat(entry.deducted_with_pay || 0);
                if (entry.leave_type === 'VL') {
                    runningBalance.vl += restoredDays;
                    row.vl.earned = restoredDays;
                } else if (entry.leave_type === 'SL') {
                    runningBalance.sl += restoredDays;
                    row.sl.earned = restoredDays;
                }
                row.period_text = entry.period_text || `${month} ${day}`;
                row.particulars = entry.transaction_desc;

            } else {
                // Manual Update / Adjustment: Trust the database snapshot
                const dbVl = parseFloat(entry.vl_bal);
                const dbSl = parseFloat(entry.sl_bal);
                const vlDiff = dbVl - runningBalance.vl;
                const slDiff = dbSl - runningBalance.sl;

                // Show the difference as earned or deducted for visual math
                if (vlDiff > 0.001) row.vl.earned = parseFloat(vlDiff.toFixed(3));
                else if (vlDiff < -0.001) row.vl.deduct_w_pay = parseFloat(Math.abs(vlDiff).toFixed(3));

                if (slDiff > 0.001) row.sl.earned = parseFloat(slDiff.toFixed(3));
                else if (slDiff < -0.001) row.sl.deduct_w_pay = parseFloat(Math.abs(slDiff).toFixed(3));

                runningBalance.vl = dbVl;
                runningBalance.sl = dbSl;

                row.period_text = entry.period_text || `${month} ${day}`;
                row.particulars = entry.transaction_desc.split('(')[0].trim();
            }

            // Set the calculated balance for display
            row.vl.balance = parseFloat(runningBalance.vl.toFixed(3));
            row.sl.balance = parseFloat(runningBalance.sl.toFixed(3));

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
                    { key: 'spl_bal', desc: 'solo' },
                    { key: 'mat_bal', desc: 'maternity' },
                    { key: 'pat_bal', desc: 'paternity' }
                ];
                
                for (const t of types) {
                    if (entry.transaction_desc.toLowerCase().includes(t.desc)) {
                        // For the first entry, we compare against the default allocation
                        const defaultCaps = { 'sp_bal': 3, 'fl_bal': 5, 'wl_bal': 5, 'spl_bal': 7, 'mat_bal': 105, 'pat_bal': 7 };
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

        // --- TIME-TRAVEL PRIVILEGE SUMMARY LOGIC ---
        // Perfect Sync: Use the snapshot from the last ACTUAL activity entry.
        // We filter out "Initialization/Rollover" rows because they reset the 
        // balance snapshots to 5.000, which hides the historical usage.
        let closingPrivileges = null;
        
        const actualActivityRows = ledgerRows.filter(r => 
            !r.transaction_desc.includes('Yearly Initialization') && 
            !r.transaction_desc.includes('Yearly Rollover')
        );

        const lastEntry = actualActivityRows[actualActivityRows.length - 1] || ledgerRows[ledgerRows.length - 1];
        
        if (lastEntry) {
            closingPrivileges = {
                special_leave: lastEntry.sp_bal,
                force_leave: lastEntry.fl_bal,
                wellness_leave: lastEntry.wl_bal,
                solo_parent_leave: lastEntry.spl_bal,
                maternity_leave: lastEntry.mat_bal,
                paternity_leave: lastEntry.pat_bal,
                special_benefits_for_women: lastEntry.sbw_bal
            };
        }

        res.json({
            employee: empRows[0],
            startingBalance,
            rows: [headerRow, ...vlSlRows],
            privilegeRows: privilegeRows,
            closingPrivileges: closingPrivileges // Pass the snapshot
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// TARDY DEDUCTION ROUTES (New - Core logic untouched)
// ============================================================

// GET all tardy deductions (for Processed Applications tab)
app.get('/api/tardy', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT t.*, e.full_name,
                   (SELECT COUNT(*) FROM accrual_logs a WHERE a.month = MONTH(t.deduction_date) AND a.year = YEAR(t.deduction_date)) > 0 AS is_closed
            FROM tardy_deductions t
            JOIN employees e ON t.employee_id = e.id
            ORDER BY t.deduction_date DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST: Deduct equivalent day from VL
app.post('/api/tardy/deduct', async (req, res) => {
    const { employee_id, equivalent_day, period_text, remarks } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Validate employee balance
        const [balRows] = await connection.execute(
            'SELECT * FROM leave_balances WHERE employee_id = ? FOR UPDATE',
            [employee_id]
        );
        if (balRows.length === 0) throw new Error('Employee balance not found');
        const bal = balRows[0];
        const currentVL = parseFloat(bal.vacation_leave || 0);
        const days = parseFloat(equivalent_day);

        if (days <= 0) throw new Error('Equivalent day must be greater than 0');

        // 2. Split pay math (same pattern as leave approve)
        const with_pay = Math.min(days, currentVL);
        const without_pay = Math.max(0, days - currentVL);

        // 3. Deduct from VL only
        await connection.execute(
            'UPDATE leave_balances SET vacation_leave = vacation_leave - ? WHERE employee_id = ?',
            [with_pay, employee_id]
        );

        // 4. Save tardy record
        const [result] = await connection.execute(
            'INSERT INTO tardy_deductions (employee_id, equivalent_day, period_text, remarks, status) VALUES (?, ?, ?, ?, ?)',
            [employee_id, days, period_text, remarks || null, 'Deducted']
        );

        // 5. Write ledger snapshot
        const [newBal] = await connection.execute(
            'SELECT * FROM leave_balances WHERE employee_id = ?',
            [employee_id]
        );
        const b = newBal[0];
        const desc = `Tardy Deduction: ${days} days deducted from VL. Period: ${period_text}.`;

        await connection.execute(
            'INSERT INTO ledger (employee_id, transaction_desc, vl_bal, sl_bal, sp_bal, fl_bal, wl_bal, spl_bal, mat_bal, pat_bal, sbw_bal, transaction_type, leave_type, deducted_with_pay, deducted_without_pay, remarks, period_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [employee_id, desc, b.vacation_leave, b.sick_leave, b.special_leave, b.force_leave, b.wellness_leave, b.solo_parent_leave, b.maternity_leave, b.paternity_leave, b.special_benefits_for_women, 'TARDY', 'VL', with_pay, without_pay, remarks || null, period_text]
        );

        await connection.commit();
        res.json({ success: true, message: `Deducted ${days} days from VL successfully.` });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

// POST: Undo a tardy deduction
app.post('/api/tardy/undo', async (req, res) => {
    const { tardy_id } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get the tardy record
        const [rows] = await connection.execute('SELECT * FROM tardy_deductions WHERE id = ?', [tardy_id]);
        if (rows.length === 0) throw new Error('Tardy record not found');
        const tardy = rows[0];
        if (tardy.status !== 'Deducted') throw new Error('Only active deductions can be undone');

        // Check if the tardy record belongs to a closed month
        const tardyDate = new Date(tardy.deduction_date);
        const tardyMonth = tardyDate.getMonth() + 1;
        const tardyYear = tardyDate.getFullYear();

        const [accrualLogs] = await connection.execute(
            'SELECT * FROM accrual_logs WHERE month = ? AND year = ?',
            [tardyMonth, tardyYear]
        );

        if (accrualLogs.length > 0) {
            throw new Error(`Undo Locked: This tardiness record belongs to a closed month (${tardyMonth}/${tardyYear}). To correct credits, please perform a Manual Balance Adjustment.`);
        }

        const days = parseFloat(tardy.equivalent_day);

        // 2. Restore VL
        await connection.execute(
            'UPDATE leave_balances SET vacation_leave = vacation_leave + ? WHERE employee_id = ?',
            [days, tardy.employee_id]
        );

        // 3. Update tardy status
        await connection.execute(
            'UPDATE tardy_deductions SET status = ? WHERE id = ?',
            ['Undone', tardy_id]
        );

        // 4. Write ledger snapshot
        const [newBal] = await connection.execute(
            'SELECT * FROM leave_balances WHERE employee_id = ?',
            [tardy.employee_id]
        );
        const b = newBal[0];
        const desc = `UNDO TARDY: Restored ${days} days to VL. Period: ${tardy.period_text}.`;

        await connection.execute(
            'INSERT INTO ledger (employee_id, transaction_desc, vl_bal, sl_bal, sp_bal, fl_bal, wl_bal, spl_bal, mat_bal, pat_bal, sbw_bal, transaction_type, leave_type, deducted_with_pay, remarks, period_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [tardy.employee_id, desc, b.vacation_leave, b.sick_leave, b.special_leave, b.force_leave, b.wellness_leave, b.solo_parent_leave, b.maternity_leave, b.paternity_leave, b.special_benefits_for_women, 'UNDO', 'VL', days, tardy.remarks || null, tardy.period_text]
        );

        await connection.commit();
        res.json({ success: true, message: 'Tardy deduction undone successfully.' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

// POST: Redo a tardy deduction
app.post('/api/tardy/redo', async (req, res) => {
    const { tardy_id } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get the tardy record
        const [rows] = await connection.execute('SELECT * FROM tardy_deductions WHERE id = ?', [tardy_id]);
        if (rows.length === 0) throw new Error('Tardy record not found');
        const tardy = rows[0];
        if (tardy.status !== 'Undone') throw new Error('Only undone deductions can be redone');

        const days = parseFloat(tardy.equivalent_day);

        // 2. Validate current balance
        const [balRows] = await connection.execute(
            'SELECT * FROM leave_balances WHERE employee_id = ? FOR UPDATE',
            [tardy.employee_id]
        );
        const bal = balRows[0];
        const currentVL = parseFloat(bal.vacation_leave || 0);
        const with_pay = Math.min(days, currentVL);
        const without_pay = Math.max(0, days - currentVL);

        // 3. Re-deduct from VL
        await connection.execute(
            'UPDATE leave_balances SET vacation_leave = vacation_leave - ? WHERE employee_id = ?',
            [with_pay, tardy.employee_id]
        );

        // 4. Update tardy status back to Deducted
        await connection.execute(
            'UPDATE tardy_deductions SET status = ? WHERE id = ?',
            ['Deducted', tardy_id]
        );

        // 5. Write ledger snapshot
        const [newBal] = await connection.execute(
            'SELECT * FROM leave_balances WHERE employee_id = ?',
            [tardy.employee_id]
        );
        const b = newBal[0];
        const desc = `REDO TARDY: Re-deducted ${days} days from VL. Period: ${tardy.period_text}.`;

        await connection.execute(
            'INSERT INTO ledger (employee_id, transaction_desc, vl_bal, sl_bal, sp_bal, fl_bal, wl_bal, spl_bal, mat_bal, pat_bal, sbw_bal, transaction_type, leave_type, deducted_with_pay, deducted_without_pay, remarks, period_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [tardy.employee_id, desc, b.vacation_leave, b.sick_leave, b.special_leave, b.force_leave, b.wellness_leave, b.solo_parent_leave, b.maternity_leave, b.paternity_leave, b.special_benefits_for_women, 'TARDY', 'VL', with_pay, without_pay, tardy.remarks || null, tardy.period_text]
        );

        await connection.commit();
        res.json({ success: true, message: 'Tardy deduction re-applied successfully.' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

// ============================================================
// CONNECTION TEST ROUTE
// ============================================================
app.get('/api/ping', async (req, res) => {
    try {
        await db.execute('SELECT 1');
        res.json({ success: true, message: 'Database connected successfully.' });
    } catch (error) {
        let message = 'Unknown database error.';
        if (error.code === 'ECONNREFUSED') {
            message = 'MySQL is not running. Please start WAMP or XAMPP first.';
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            message = 'Access denied. Check DB_USER and DB_PASSWORD in your .env file.';
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            message = 'Database not found on this server. Check DB_NAME and DB_PORT in your .env file. You may be connecting to the wrong MySQL instance.';
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
            message = 'Connection timed out. Check DB_HOST and DB_PORT in your .env file.';
        } else {
            message = error.message;
        }
        res.status(500).json({ success: false, message });
    }
});

// 7. System Utilities
app.get('/api/system/backup', async (req, res) => {
    try {
        const dump = await mysqldump({
            connection: {
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD === undefined ? 'admin' : process.env.DB_PASSWORD,
                database: process.env.DB_NAME || 'elrms_v2',
                port: parseInt(process.env.DB_PORT) || 3306
            },
        });
        
        // Combine schema and data for a full backup
        const fullDump = dump.dump.schema + '\n\n' + dump.dump.data;
        
        res.setHeader('Content-Type', 'application/sql');
        res.setHeader('Content-Disposition', `attachment; filename="elrms_backup_${new Date().toISOString().split('T')[0]}.sql"`);
        res.send(fullDump);
    } catch (error) {
        console.error('Backup Error:', error);
        res.status(500).json({ error: 'Database backup failed: ' + error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
