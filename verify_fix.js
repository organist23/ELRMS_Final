const db = require('./server/db');

async function verifyAPI() {
    const id = 'EMP-2026-111';
    const year = '2026';
    try {
        // 1. Get Employee Info with live balances
        const [empRows] = await db.execute(`
            SELECT e.*, b.special_leave, b.force_leave, b.wellness_leave, b.solo_parent_leave, b.bbw_vl, b.bbw_sl
            FROM employees e
            JOIN leave_balances b ON e.id = b.employee_id
            WHERE e.id = ?
        `, [id]);
        
        if (empRows.length === 0) {
            console.log('Employee not found');
            return;
        }
        const employee = empRows[0];
        console.log('Employee (with BBW):', { id: employee.id, bbw_vl: employee.bbw_vl, bbw_sl: employee.bbw_sl });

        // 2. Get Starting Balance (Archive from previous year)
        const prevYear = parseInt(year) - 1;
        const regYear = new Date(employee.created_at).getFullYear();

        const [archiveRows] = await db.execute(
            'SELECT * FROM yearly_credits_archive WHERE employee_id = ? AND year = ?',
            [id, prevYear]
        );
        
        let startingBalance = { vl: 0, sl: 0 };
        if (archiveRows.length > 0 && regYear <= prevYear) {
            startingBalance.vl = parseFloat(archiveRows[0].vl_forwarded);
            startingBalance.sl = parseFloat(archiveRows[0].sl_forwarded);
            console.log('Found Archive:', startingBalance);
        } else {
            // New employee registered in this year - Use their initial Base Balance (BBW)
            startingBalance.vl = parseFloat(employee.bbw_vl || 0);
            startingBalance.sl = parseFloat(employee.bbw_sl || 0);
            console.log('Using BBW Fallback:', startingBalance);
        }

        // 3. Test Header Row
        const headerRow = {
            date: `${year}-01-01`,
            period_text: year.toString(),
            particulars: 'BALANCE BROUGHT FORWARDED',
            remarks: '',
            vl: { earned: 0, deduct_w_pay: 0, deduct_wo_pay: 0, balance: startingBalance.vl },
            sl: { earned: 0, deduct_w_pay: 0, deduct_wo_pay: 0, balance: startingBalance.sl }
        };
        console.log('Header Row:', headerRow);

        if (headerRow.vl.balance === 78.67) {
            console.log('SUCCESS: Header Row balance matches BBW (78.67)');
        } else {
            console.log('FAILURE: Header Row balance is', headerRow.vl.balance, 'expected 78.67');
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

verifyAPI();
