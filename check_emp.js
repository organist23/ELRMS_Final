const db = require('./server/db');

async function checkEmployee() {
    try {
        const [emp] = await db.execute('SELECT * FROM employees WHERE id = "EMP-2026-111"');
        console.log('Employee:', emp[0]);
        
        const [balances] = await db.execute('SELECT * FROM leave_balances WHERE employee_id = "EMP-2026-111"');
        console.log('Balances:', balances[0]);
        
        const [ledger] = await db.execute('SELECT * FROM ledger WHERE employee_id = "EMP-2026-111" ORDER BY action_date ASC');
        console.log('Ledger Entries:', ledger.length);
        ledger.forEach(l => {
            console.log(`${l.action_date} | ${l.transaction_type} | ${l.transaction_desc} | VL: ${l.vl_bal} | SL: ${l.sl_bal} | Earned: ${l.earned}`);
        });
        
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkEmployee();
