const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Search API
app.get('/api/customers/search', (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  const sql = `
    SELECT * FROM customers
    WHERE name LIKE ? OR customer_code LIKE ? OR phone LIKE ?
  `;
  const params = [`%${query}%`, `%${query}%`, `%${query}%`];

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: err.message });
    }

    // Transform data to match frontend expectations
    const results = rows.map(row => {
      let extraData = {};
      try {
        extraData = JSON.parse(row.full_data);
      } catch (e) {
        console.error("Error parsing full_data JSON", e);
      }

      return {
        customer: {
          id: row.customer_code,
          name: row.name,
          phone: row.phone,
          address_residential: row.residential_address,
          address_company: row.company_address,
          company_name: row.company_name
        },
        history: extraData.history || [],
        financial_summary: extraData.financial_summary || {},
        credit_score: extraData.credit_score || {}
      };
    });

    res.json(results);
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
