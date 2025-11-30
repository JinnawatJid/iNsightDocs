const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.sqlite');
let db;

function createTableFromCSV(dbInstance, tableName, csvFilePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        let headers = [];

        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('headers', (h) => {
                headers = h;
            })
            .on('data', (data) => results.push(data))
            .on('end', () => {
                if (headers.length === 0) {
                    console.log(`No headers found in ${csvFilePath}`);
                    return resolve();
                }

                const columns = headers.map(header => `"${header}" TEXT`).join(', ');
                const createTableSql = `CREATE TABLE "${tableName}" (${columns});`;

                dbInstance.serialize(() => {
                    dbInstance.run(createTableSql, (err) => {
                        if (err) {
                            console.error(`Error creating table ${tableName}:`, err.message);
                            return reject(err);
                        }
                        console.log(`Table "${tableName}" created.`);

                        const placeholders = headers.map(() => '?').join(', ');
                        const insertSql = `INSERT INTO "${tableName}" ("${headers.join('", "')}") VALUES (${placeholders})`;

                        const stmt = dbInstance.prepare(insertSql);

                        dbInstance.parallelize(() => {
                            results.forEach((row) => {
                                const values = headers.map(header => row[header]);
                                stmt.run(values);
                            });
                        });

                        stmt.finalize((err) => {
                            if (err) {
                                console.error(`Error inserting data into ${tableName}:`, err.message);
                                return reject(err);
                            }
                            console.log(`Inserted ${results.length} rows into "${tableName}".`);
                            resolve();
                        });
                    });
                });
            })
            .on('error', (err) => reject(err));
    });
}

const initialize = async () => {
    if (fs.existsSync(DB_PATH)) {
        console.log('Database exists. Connecting...');
        db = new sqlite3.Database(DB_PATH);
        return;
    }

    console.log('Database not found. Initializing from CSV...');
    db = new sqlite3.Database(DB_PATH);

    try {
        await createTableFromCSV(db, 'Customers', path.join(__dirname, 'Customers_rows.csv'));
        await createTableFromCSV(db, 'AY_ACCUM', path.join(__dirname, 'AY_ACCUM_rows.csv'));
        console.log('Database initialization complete.');
    } catch (error) {
        console.error('Database initialization failed:', error);
        // Clean up partial file
        try {
            db.close();
            if (fs.existsSync(DB_PATH)) {
                fs.unlinkSync(DB_PATH);
            }
        } catch (cleanupErr) {
            console.error('Error during cleanup:', cleanupErr);
        }
        process.exit(1);
    }
};

const query = (text, params = []) => {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Database not initialized. Ensure initialize() is called.'));
        }
        db.all(text, params, (err, rows) => {
            if (err) {
                return reject(err);
            }
            resolve({ rows });
        });
    });
};

module.exports = { initialize, query };
