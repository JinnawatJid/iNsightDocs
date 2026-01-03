const db = require('./backend/db');
const path = require('path');
const fs = require('fs');

async function seed() {
    await db.initialize();

    // Create a dummy history record for 01017AY
    const txId = 'AYCA2501/999';
    await db.runAsync(`
        INSERT INTO CreditRequests (tx_id, customer_no, customer_name, status, request_amount, snapshot_data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
        txId,
        '01017AY',
        'นาย เกียรติศักดิ์ เรืองพร',
        'Approved',
        50000,
        JSON.stringify({ name: 'นาย เกียรติศักดิ์ เรืองพร' }),
        new Date().toISOString()
    ]);
    console.log('Seeded history');
}

seed().catch(console.error);
