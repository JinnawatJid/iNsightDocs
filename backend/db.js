require('dotenv').config();
const { Pool } = require('pg');

// Check if DATABASE_URL is provided
if (!process.env.DATABASE_URL) {
  console.warn("WARNING: DATABASE_URL is missing in .env file. Database connection will fail.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
