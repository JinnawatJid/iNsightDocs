# Routing & Encoding Architecture

This document describes the routing, URL encoding, and database retrieval patterns specifically required for handling Credit Requests in the backend API.

## 1. Transaction ID URL Encoding

### The Problem
Credit Request IDs in the system inherently contain forward slashes (e.g., `AYCA2603/006`). When these IDs are passed as path parameters in API requests (like `/api/credit-requests/AYCA2603/006/pdf`), standard web servers, routing proxies (like NGINX or IIS), and client browsers interpret the slash as a directory separator, which breaks the API route definition (`/api/credit-requests/:id/pdf`).

### The Solution
To safely transmit these IDs, the frontend URL-encodes the slash as `%2F` (e.g., `AYCA2603%2F006`).

**Crucially:** Depending on the reverse proxy and server configuration, the Express.js backend may receive `req.params.id` in its raw, encoded form (`AYCA2603%2F006`). If this encoded string is passed directly into a database query (e.g., `WHERE tx_id = ?`), the query will search for the literal string `AYCA2603%2F006` rather than `AYCA2603/006`, resulting in a **404 Not Found** error.

### Implementation Standard
**All backend controllers** that accept a transaction ID via a route parameter must explicitly decode it before using it in any business logic or database queries.

```javascript
// Example: Correct handling in an Express Controller
exports.getSomeCreditRequestData = async (req, res) => {
    // ⚠️ CRITICAL: Always decode the ID to handle '%2F' encodings from proxies
    const id = decodeURIComponent(req.params.id);

    // Proceed with database query using the decoded 'id'
    const sql = 'SELECT * FROM CreditRequests WHERE tx_id = ?';
    const { rows } = await db.query(sql, [id]);

    // ...
};
```
*Affected controllers generally include: `pdfController.js` and `creditRequestController.js`.*

---

## 2. Database Retrieval & Missing Customer Data Fallback

### The Problem
When generating PDFs or viewing historical credit requests, the system attempts to join the `CreditRequests` table with the live `Customers` table to retrieve up-to-date information (such as the customer's current address or bank details).

However, if a customer record is deleted, archived, or temporarily missing from the `Customers` database table (e.g., due to an incomplete sync or a manual deletion), using an `INNER JOIN` in the SQL query will cause the entire query to return zero rows. This results in the system incorrectly reporting that the "Credit Request not found", even though the request itself exists and possesses vital historical data.

### The Solution: Snapshot Fallback
When a Credit Request is created, a "snapshot" of the customer's data at that exact moment in time is serialized and stored in the `snapshot_data` JSON column of the `CreditRequests` table.

To ensure the system remains resilient and can still generate PDFs or display historical requests even when live customer data is absent:

1. **Use `LEFT JOIN`:** SQL queries fetching a credit request alongside its customer data **must** use a `LEFT JOIN` on the `Customers` table, never an `INNER JOIN`.
2. **Prioritize Snapshot Data:** Application logic (such as in `pdfController.js`) must be designed to safely fall back to reading from `snapshot_data` if the live joined columns (e.g., `c.db_customer_name`) return `null`.

### Implementation Standard
```sql
-- ❌ INCORRECT (Will fail if customer data is missing)
SELECT cr.*, c."Name"
FROM CreditRequests cr
JOIN Customers c ON cr.customer_no = c."No_"
WHERE cr.tx_id = ?

-- ✅ CORRECT (Allows fallback to snapshot data)
SELECT cr.*, c."Name"
FROM CreditRequests cr
LEFT JOIN Customers c ON cr.customer_no = c."No_"
WHERE cr.tx_id = ?
```