const logger = require('./utils/logger');
require('dotenv').config();

const dbType = process.env.DB_TYPE || 'sqlite';

logger.info(`Loading database module for: ${dbType}`);

if (dbType === 'mssql') {
    module.exports = require('./db-mssql');
} else {
    module.exports = require('./db-sqlite');
}
