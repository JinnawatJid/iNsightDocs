const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const db = require('../db');

const LOG_FILE_PATH = path.join(__dirname, '../logs/access.log');

exports.getSystemLogs = async (req, res) => {
    let fileHandle = null;
    try {
        try {
            await fsPromises.access(LOG_FILE_PATH);
        } catch {
             return res.status(200).json({ logs: [], message: 'Log file not found.' });
        }

        const stats = await fsPromises.stat(LOG_FILE_PATH);
        const fileSize = stats.size;
        const bufferSize = Math.min(100 * 1024, fileSize); // 100KB
        const buffer = Buffer.alloc(bufferSize);

        fileHandle = await fsPromises.open(LOG_FILE_PATH, 'r');
        await fileHandle.read(buffer, 0, bufferSize, fileSize - bufferSize);

        const data = buffer.toString('utf8');
        const lines = data.split('\n');

        if (fileSize > bufferSize) {
            lines.shift();
        }

        const recentLogs = lines.reverse().filter(l => l.trim().length > 0).slice(0, 1000);

        const parsedLogs = recentLogs.map(line => {
             const parts = line.match(/^(\S+) \S+ \S+ \[(.*?)\] "(.*?)" (\d{3}) (\S+)/);
             if (parts) {
                 return {
                     raw: line,
                     ip: parts[1],
                     timestamp: parts[2],
                     request: parts[3],
                     status: parseInt(parts[4]),
                     size: parts[5]
                 };
             }
             return { raw: line };
        });

        res.status(200).json({ logs: parsedLogs });

    } catch (error) {
        console.error('Error reading logs:', error);
        res.status(500).json({ error: 'Failed to read system logs' });
    } finally {
        if (fileHandle) {
            await fileHandle.close();
        }
    }
};

exports.getRawTransactions = async (req, res) => {
    try {
        let sql;
        if (db.dbType === 'mssql') {
            sql = 'SELECT TOP 100 * FROM CreditRequests ORDER BY created_at DESC';
        } else {
            sql = 'SELECT * FROM CreditRequests ORDER BY created_at DESC LIMIT 100';
        }

        const { rows } = await db.query(sql);

        const processedRows = rows.map(row => {
            let snapshot = row.snapshot_data;
            if (typeof snapshot === 'string') {
                try {
                    snapshot = JSON.parse(snapshot);
                } catch (e) {
                    // keep as string
                }
            }
            return {
                ...row,
                snapshot_data: snapshot
            };
        });

        res.status(200).json({ data: processedRows });

    } catch (error) {
        console.error('Error fetching raw transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
};
