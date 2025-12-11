require('dotenv').config();

const dbType = process.env.DB_TYPE || 'sqlite';

console.log(`Loading database module for: ${dbType}`);

if (dbType === 'mssql') {
    module.exports = require('./db-mssql');
} else {
    module.exports = require('./db-sqlite');
}
