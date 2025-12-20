const db = require('../backend/db');
db.initialize().then(async () => {
    try {
        await db.runAsync(`INSERT OR IGNORE INTO Customers ("No_", "Name", "VAT Registration No_") VALUES ('TEST999', 'Test Company Limited', '1234567890')`);
        console.log("Customer inserted");
    } catch (e) {
        console.error(e);
    }
});
