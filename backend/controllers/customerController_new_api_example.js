const logger = require('../utils/logger');
const axios = require('axios');

// Configuration
const API_URL = "http://192.192.0.37:8280/customer-sp682/1.0.0";
// TODO: Store this securely (env var)
const API_KEY = process.env.CUSTOMER_API_KEY || "YOUR_API_KEY";

/**
 * Searches customers using the internal API.
 *
 * ISSUE: The internal API does not support "$or" logic. It treats "$or" as a column name and fails.
 * SOLUTION: We simulate "OR" logic by sending parallel requests for each field we want to search
 * (ID, Name, Phone) and merging the results.
 */
exports.searchCustomers = async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  // 1. Define the fields we want to check (Priority Order)
  // We use "$like" for partial matching as confirmed by testing.
  const searchRequests = [
    { label: "By ID",   payload: { "No_": { "$like": `%${query}%` } } },
    { label: "By Name", payload: { "Name": { "$like": `%${query}%` } } },
    // Note: The API treats "Mobile Phone No_" as a specific column.
    // If "Phone No_" is also needed, add another request.
    { label: "By Mobile", payload: { "Mobile Phone No_": { "$like": `%${query}%` } } }
  ];

  try {
    // 2. Execute requests in parallel (Split)
    const promises = searchRequests.map(reqData =>
       axios.post(API_URL, {
         page: 1,
         size: 10, // Limit size per request to keep it fast
         ...reqData.payload
       }, {
        headers: {
          "apikey": API_KEY,
          "Content-Type": "application/json"
        },
        timeout: 10000
      }).then(response => response.data.data || []) // Extract data array or empty
        .catch(err => {
            logger.warn(`Search '${reqData.label}' failed:`, err.message);
            return []; // Ignore failed sub-requests
        })
    );

    const resultsArrays = await Promise.all(promises);

    // 3. Merge and Deduplicate (Merge)
    const allCustomers = resultsArrays.flat();
    const uniqueCustomers = [];
    const seenIds = new Set();

    for (const customer of allCustomers) {
        if (!customer["No_"]) continue;

        if (!seenIds.has(customer["No_"])) {
            seenIds.add(customer["No_"]);
            uniqueCustomers.push(customer);
        }
    }

    // 4. Map to Frontend Format
    const mappedResults = uniqueCustomers.map(row => {
        // Address Concatenation logic
        const addressParts = [
            row["Address"],
            row["City"],
            row["County"],
            row["Post Code"]
        ].filter(part => part && part.trim() !== "");

        const fullAddress = addressParts.join(' ');

        return {
            customer: {
                id: row["No_"],
                name: row["Name"],
                contact_person: row["Contact"],
                // Prioritize Mobile, fallback to Phone
                phone: row["Mobile Phone No_"] || row["Phone No_"],
                email: row["E-Mail"],
                tax_id: row["VAT Registration No_"],

                // Mapped Address Fields
                address_residential: fullAddress,
                address_company: fullAddress,
                company_name: row["Name"],
                address: row["Address"],
                district: row["City"],
                province: row["County"],
                zipcode: row["Post Code"]
            },
            // Financial/History placeholders (API doesn't return these)
            history: [],
            financial_summary: {},
            credit_score: { can_request_credit: true, suggestions: [] }
        };
    });

    res.json(mappedResults);

  } catch (err) {
    logger.error("Critical Search Error:", err.message);
    res.status(500).json({ error: "Failed to fetch customers from external API" });
  }
};
