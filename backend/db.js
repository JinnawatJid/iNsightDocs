const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('Error connecting to the SQLite database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

module.exports = {
    query: (text, params = []) => {
        return new Promise((resolve, reject) => {
            db.all(text, params, (err, rows) => {
                if (err) {
                    return reject(err);
                }
                resolve({ rows });
            });
        });
    }
};
