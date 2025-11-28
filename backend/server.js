const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Search API
app.get('/api/customers/search', async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  // Postgres SQL Query
  // Note: Using ILIKE for case-insensitive search
  // Double quotes for column names because they might contain spaces or special chars (like "No_", "Phone No_")
  const sql = `
    SELECT
      "No_",
      "Name",
      "Contact",
      "Phone No_",
      "VAT Registration No_",
      "Address",
      "City",
      "County",
      "Post Code"
    FROM "Customers"
    WHERE
      "Name" ILIKE $1 OR
      "No_" ILIKE $1 OR
      "Phone No_" ILIKE $1 OR
      "Contact" ILIKE $1
    LIMIT 20
  `;

  const searchPattern = `%${query}%`;
  const params = [searchPattern];

  try {
    const { rows } = await db.query(sql, params);

    // Transform data to match frontend expectations
    const results = rows.map(row => {
      // Logic: Address Concatenation
      const addressParts = [
        row["Address"],
        row["City"],
        row["County"],
        row["Post Code"]
      ].filter(part => part && part.trim() !== ""); // Filter out empty parts

      const fullAddress = addressParts.join(' ');

      // Logic: Company vs Individual
      // If VAT Registration No_ is present and not empty, it's a Company.
      const isCompany = row["VAT Registration No_"] && row["VAT Registration No_"].trim().length > 0;
      const customerType = isCompany ? 'Company' : 'Individual';

      return {
        customer: {
          id: row["No_"],
          name: row["Name"], // Company/Store Name
          contact_person: row["Contact"], // Person Name
          phone: row["Phone No_"],
          tax_id: row["VAT Registration No_"],
          type: customerType,
          address_residential: fullAddress, // Assuming same address for now if not specified
          address_company: fullAddress,
          company_name: row["Name"], // Mapped same as name
          // Raw address fields for form pre-filling
          address: row["Address"],
          district: row["City"],       // Amphoe/District
          province: row["County"],     // Province
          zipcode: row["Post Code"]
        },
        // Mocking history/financials for now as they are likely in different tables
        // In a real scenario, you'd do a JOIN or separate queries here.
        history: [],
        financial_summary: {},
        credit_score: {}
      };
    });

    res.json(results);

  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
