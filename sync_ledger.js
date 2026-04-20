const db = require('./server/db');

async function syncLedger() {
    const employee_id = 'EMP-2026-111';
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get Base Balance
        const [balances] = await connection.execute('SELECT bbw_vl, bbw_sl FROM leave_balances WHERE employee_id = ?', [employee_id]);
        if (balances.length === 0) throw new Error('Employee balances not found');
        
        let runningVl = parseFloat(balances[0].bbw_vl);
        let runningSl = parseFloat(balances[0].bbw_sl);
        console.log(`Starting Base: VL ${runningVl}, SL ${runningSl}`);

        // 2. Get Ledger Entries (Order by date)
        const [ledger] = await connection.execute('SELECT * FROM ledger WHERE employee_id = ? ORDER BY action_date ASC', [employee_id]);
        console.log(`Processing ${ledger.length} ledger entries...`);

        for (const entry of ledger) {
            const earned = parseFloat(entry.earned || 0);
            const deducted = parseFloat(entry.deducted_with_pay || 0);
            
            // Recalculate
            runningVl = runningVl + earned - deducted;
            runningSl = runningSl + earned - deducted;

            // Update Entry
            await connection.execute(
                'UPDATE ledger SET vl_bal = ?, sl_bal = ? WHERE id = ?',
                [runningVl.toFixed(3), runningSl.toFixed(3), entry.id]
            );
            console.log(`Updated Entry ID ${entry.id}: VL ${runningVl.toFixed(3)}, SL ${runningSl.toFixed(3)} (Type: ${entry.transaction_type})`);
        }

        // 3. Update main leave_balances table
        await connection.execute(
            'UPDATE leave_balances SET vacation_leave = ?, sick_leave = ? WHERE employee_id = ?',
            [runningVl.toFixed(3), runningSl.toFixed(3), employee_id]
        );
        console.log(`Final Balances Updated for ${employee_id}`);

        await connection.commit();
        console.log('SUCCESS: Ledger and balances synchronized.');

    } catch (err) {
        await connection.rollback();
        console.error('ERROR:', err.message);
    } finally {
        connection.release();
        process.exit();
    }
}

syncLedger();
