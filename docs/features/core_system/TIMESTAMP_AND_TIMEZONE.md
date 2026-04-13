# Timestamp and Timezone Standards

This document outlines the standard architecture for handling timestamps, tracking workflow changes, and converting timezones across the iNsightDocs system.

## 1. Database Standards (UTC)
To prevent drift and data bugs across different server deployments, **all database timestamps must strictly be stored in UTC format**.

- **SQLite**: Use `CURRENT_TIMESTAMP`. (SQLite implicitly stores this in UTC).
- **MSSQL**: Use `GETUTCDATE()`.
- **Node.js**: When generating timestamps from the backend to insert into the database, use `new Date().toISOString()`. Do not use SQL drivers or standard `new Date().toString()` which relies on the server's local operating system time.

## 2. Tracking Workflow "Sent" Time
To accurately represent when a request transitioned stages (e.g. from "Draft" to "Opened", or "Reviewed" to "Approved"), the system relies on the `updated_at` column in the `CreditRequests` table.

- **Initial Creation**: `created_at` represents when the draft was first opened.
- **Workflow Progression**: Every time the request state is modified or submitted, the `updated_at` column is updated.
- **Pending Requests UI**: The Dashboard's Pending Request list fetches and sorts by `updated_at DESC`. This ensures users see the time the action was actually forwarded to them (the "Sent Time").

## 3. Frontend Timezone Parsing (Local Thai Time)
The system is built for a Thai enterprise context, requiring timestamps to be displayed in UTC+7 (Local Thai Time). Instead of manually adding offsets on the backend, the frontend utilizes native JavaScript `Date` objects to handle timezone conversions securely.

### The `formatDateString` Utility
Located in `src/utils/dateUtils.js`, this utility normalizes SQL date strings before parsing them.

1. **Standardizing Strings:** SQL strings (e.g. `2026-03-18 15:30:00`) are modified to replace spaces with `T`.
2. **Forcing UTC Parsing:** The utility explicitly appends a `Z` to the end of the string if it lacks an offset identifier. This guarantees that `new Date('2026-03-18T15:30:00Z')` accurately treats the backend string as UTC.
3. **Legacy Fallback:** Because the system historically saved Local Thai Time into the database without explicit offsets, the utility incorporates a "rollout date cutoff". Timestamps from before the UTC transition are identified and intentionally parsed without a `Z`, allowing the browser to treat them as local time, preventing a massive +7 hour visual regression on historical data.

### Usage
```javascript
import { formatDateString } from '@/utils/dateUtils';

// Standard Usage
const dateObj = formatDateString(req.updated_at);
console.log(dateObj.toLocaleString('th-TH')); // Outputs correct UTC+7 time
```
