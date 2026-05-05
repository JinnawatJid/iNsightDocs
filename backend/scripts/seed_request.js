const db = require('../db');
async function seed() {
    await db.query(`
        INSERT INTO CreditRequests (tx_id, customer_no, customer_name, status, snapshot_data, request_type, created_at, updated_at)
        VALUES ('00TR-1234', 'CUST001', 'Test Customer', 'SalesSubmitted', '{"customer":{}, "transactionData": {"amount": "1000000", "termGS": "30", "requestType": ["เครดิตใหม่"]}}', 'เครดิตใหม่', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    `);
    console.log("Seeded");
}
seed().catch(console.error);
