const axios = require('axios');

// Configuration
const API_URL = "http://192.192.0.37:8280/customer-sp682/1.0.0";
// TODO: Store this securely (env var)
const API_KEY = process.env.CUSTOMER_API_KEY || "YOUR_API_KEY";

exports.searchCustomers = async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  // Hypothetical Payload - Depends on the results of `scripts/test_customer_api.py`
  // Assumption: API supports MongoDB-like `$or` and `$like` or `$regex`
  const payload = {
    "page": 1,
    "size": 20,
    "$or": [
      { "No_": { "$like": `%${query}%` } },
      { "Name": { "$like": `%${query}%` } },
      { "Phone No_": { "$like": `%${query}%` } },
      { "Mobile Phone No_": { "$like": `%${query}%` } },
      { "Contact": { "$like": `%${query}%` } }
    ]
  };

  try {
    const response = await axios.post(API_URL, payload, {
      headers: {
        "apikey": API_KEY,
        "Content-Type": "application/json"
      },
      timeout: 10000
    });

    const apiData = response.data;

    if (!apiData.data) {
        return res.json([]);
    }

    // Map the external API response to the format expected by the frontend
    const results = apiData.data.map(row => {
        // Address Concatenation logic
        const addressParts = [
            row["Address"],
            row["City"],
            row["County"],
            row["Post Code"]
        ].filter(part => part && part.trim() !== "");

        const fullAddress = addressParts.join(' ');

        // Return matched structure
        return {
            customer: {
                id: row["No_"],
                name: row["Name"],
                contact_person: row["Contact"],
                phone: row["Phone No_"] || row["Mobile Phone No_"],
                // ... map other fields as needed
                address_residential: fullAddress,
                // ...
            },
            // Financial summary and history might need separate API calls
            // or might be null if not provided by this API
            history: [],
            financial_summary: {},
            credit_score: { can_request_credit: true, suggestions: [] }
        };
    });

    res.json(results);

  } catch (err) {
    console.error("External API error:", err.message);
    res.status(500).json({ error: "Failed to fetch customers from external API" });
  }
};
