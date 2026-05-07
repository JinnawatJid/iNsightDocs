Summary
-------
This document records a discovered issue and fix related to how regional-reviewer branch codes are matched to credit-request `tx_id` values.

Root cause
----------
- The system normalized reviewer branch codes (e.g. `00TR` → `TR`) but applied an overly specific SQL pattern `tx_id LIKE '__TR%'` when filtering pending requests.
- Many existing `tx_id` entries are stored without a two-character numeric prefix (e.g. `TRCA6905/01`), so the `__TR%` pattern did not match them.

Fix applied
-----------
- In `backend/controllers/creditRequestController.js` the branch-filter logic was updated to:
  - Normalize both the reviewer branch (via `normalizeBranchCode(getBranchCodeFromUser(req.user))`) and the configured zone codes before comparison.
  - Build SQL patterns that match the branch code directly (e.g. `tx_id LIKE 'TR%'`) rather than assuming a 2-char prefix.
- Additional debug logging added to help verify region-config loading, normalization, allowed branches, final SQL, and returned rows.

Files changed
-------------
- Backend controller: `backend/controllers/creditRequestController.js` — updated branch-mapping filter and added debug logs.
- Unit tests: `backend/tests/normalizeBranchCode.test.cjs` — extended tests for normalized region mapping.

How to reproduce locally
------------------------
1. Start backend (from workspace root):

```bash
npm install --prefix backend
npm start --prefix backend
```

2. Open the app as a regional reviewer (or enable DEV_MODE auth). Load Pending Requests. Watch backend logs for debug lines showing normalization and SQL.

Example debug lines to look for:
- `[DEBUG] Raw branch: "00TR", Normalized: "TR"`
- `[DEBUG] Found matching region! allowedBranches: ["TJ","TR","TS", ...]`
- `[DEBUG] Branch filter: (tx_id LIKE ? OR ...) with params: ["TR%", ...]`
- `[DEBUG] Requests with TR in tx_id: [{"tx_id":"TRCA6905/01", ...}]`

3. Optional DB checks (sqlite):

```bash
sqlite3 backend/data/database.db "SELECT tx_id, status FROM CreditRequests WHERE tx_id LIKE '%TR%';"
```

Why this matters
-----------------
- Other components or SQL queries may still be assuming a fixed prefix (e.g. `__` + code). That assumption can silently hide requests when `tx_id` formats vary.
- Normalizing codes and matching on the normalized branch token is more robust.

Recommended follow-ups
----------------------
- Search repository for other occurrences of patterns like `__${code}%`, `__${...}` or tx_id LIKE constructions. Update to use flexible patterns (`${code}%`) or normalize both sides.
  - Example grep: `grep -R "__[A-Z][A-Z]" -n backend || true`
- Add integration test(s) that simulate both `TRCA...` and `00TRCA...` tx_id formats and assert the reviewer sees the expected requests.
- Consider standardizing `tx_id` generation/storage in the DB (pick one canonical prefix format) to avoid ambiguity.

Notes
-----
- The patch deliberately "fail-closed" in case of errors (returns no rows) to avoid information leakage.
- Created a repo memory note: `/memories/repo/branch-filtering.md` with the key takeaways and matching rules.

If you want, I can:
- Open a PR with the changes we made, or
- Run a repo search and automatically update other occurrences of the `__` prefix usage (I will prepare a safe patch for review).
