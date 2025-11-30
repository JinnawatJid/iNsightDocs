const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.sqlite');

// Delete existing database file if it exists to start fresh
if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('Existing database deleted.');
}

const db = new sqlite3.Database(DB_PATH);

function createTableFromCSV(tableName, csvFilePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        let headers = [];

        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('headers', (h) => {
                headers = h;
                // Sanitize headers for SQL column names (basic sanitation)
                // We'll wrap them in quotes in the query to handle spaces/special chars
            })
            .on('data', (data) => results.push(data))
            .on('end', () => {
                if (headers.length === 0) {
                    console.log(`No headers found in ${csvFilePath}`);
                    return resolve();
                }

                // Create Table Schema
                // Using TEXT for all columns for simplicity and flexibility as requested
                const columns = headers.map(header => `"${header}" TEXT`).join(', ');
                const createTableSql = `CREATE TABLE "${tableName}" (${columns});`;

                db.serialize(() => {
                    db.run(createTableSql, (err) => {
                        if (err) {
                            console.error(`Error creating table ${tableName}:`, err.message);
                            return reject(err);
                        }
                        console.log(`Table "${tableName}" created.`);

                        // Prepare Insert Statement
                        const placeholders = headers.map(() => '?').join(', ');
                        const insertSql = `INSERT INTO "${tableName}" ("${headers.join('", "')}") VALUES (${placeholders})`;

                        const stmt = db.prepare(insertSql);

                        db.parallelize(() => {
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

async function init() {
    try {
        await createTableFromCSV('Customers', path.join(__dirname, 'Customers_rows.csv'));
        await createTableFromCSV('AY_ACCUM', path.join(__dirname, 'AY_ACCUM_rows.csv'));
        console.log('Database initialization complete.');
    } catch (error) {
        console.error('Database initialization failed:', error);
    } finally {
        db.close();
    }
}

init();
