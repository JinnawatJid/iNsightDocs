const { upsertBlacklist } = require('../controllers/customerController');

const reqAdd = {
    body: {
        name: 'นาย ทดสอบลบ',
        taxId: '9999999999999',
        is_blacklisted: true
    }
};

const reqRemove = {
    body: {
        name: 'นาย ทดสอบลบ',
        taxId: '9999999999999',
        is_blacklisted: false
    }
};

const res = {
    json: (data) => console.log('Response:', data),
    status: (code) => ({
        json: (data) => console.log('Error Response:', code, data)
    })
};

(async () => {
    // Run the DB init to ensure the table exists
    const db = require('../db');
    await db.initialize();

    console.log('Testing Add to Blacklist');
    await upsertBlacklist(reqAdd, res);

    console.log('Testing Remove from Blacklist');
    await upsertBlacklist(reqRemove, res);
})();
