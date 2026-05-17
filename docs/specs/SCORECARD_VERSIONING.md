# Scorecard Versioning — Technical Specification

## Purpose
Document the backend and frontend implementation of scorecard versioning, API routes, DB schema, frontend store usage, and verification steps.

## API Endpoints
- `GET /api/scorecard/:type/versions`
  - Response: list of version metadata
  - Fields: `id`, `comment`, `created_at`, `created_by`

- `GET /api/scorecard/:type/versions/:id`
  - Response: full version payload including `config_json` (stringified JSON) and metadata

- `POST /api/scorecard/:type/versions/:id/revert`
  - Creates a new immutable version that is a copy of the selected version and sets it as the active config.
  - Response: success/failure

## Database Schema (ScorecardVersions)
- `id` (primary key, auto)
- `scorecard_type` (varchar) — `new` or `existing`
- `config_json` (text) — the full JSON payload of the scorecard
- `comment` (varchar) — admin-supplied note (optional)
- `created_by` (varchar) — username or system
- `created_at` (timestamp) — stored in UTC (DB default `CURRENT_TIMESTAMP` / `GETUTCDATE()`)

Notes:
- Timestamps are stored in UTC. Frontend normalizes and appends `Z` where appropriate for legacy values.

## Frontend Integration
- Store: `src/stores/scorecard.js`
  - `loadScorecard(type)` — loads active config and fetches `listScorecardVersions`.
  - `versions` state contains an immutable `original` baseline prepended in the client.
  - `fetchVersion(id)` — retrieves full version payload via API.
  - `revertVersion(id)` — calls the revert endpoint and reloads the active config.

- Component: `src/components/configuration/ScorecardManagementTab.vue`
  - Versions dropdown lists `store.versions` (baseline first).
  - Selecting the baseline (id=`original`) loads the `originalConfigStr` from the store.
  - Selecting other ids calls `fetchVersion` and loads `config_json` into `store.configData` for preview (non-destructive).
  - The `ใช้เวอร์ชัน` apply button was intentionally removed; reverts are performed by the `revertVersion` API only if desired.

## UX Decisions
- Preview-only load: selecting a version replaces the editor contents for preview. This avoids accidental overwrites.
- Immutable baseline: a client-side baseline option is available for quick restore; it is not stored as a DB version row.
- No immediate apply: users must explicitly save changes to persist any edits.

## Migration & Rollout
- Add `ScorecardVersions` table to both SQLite and MSSQL initialization scripts (`backend/db-sqlite.js` and `backend/db-mssql.js`).
- Optional: Backfill historical configs as version rows if required.

## Verification Checklist
1. Start backend and hit `GET /api/scorecard/new/versions` — expect an array of metadata.
2. Ensure created_at values are in ISO or a parseable format; if missing, client displays empty date.
3. In UI, load Scorecard Management — versions dropdown should show baseline and backend versions.
4. Select a backend version — editor updates to show that version's config.
5. Select baseline — editor updates to original defaults.
6. Edit and `บันทึกการเปลี่ยนแปลง` — backend saves config and a new version should be created (verify `ScorecardVersions` contains new row).

## Example curl
List versions:

```bash
curl -s "http://localhost:3000/api/scorecard/new/versions" | jq .
```

Fetch version by id:

```bash
curl -s "http://localhost:3000/api/scorecard/new/versions/123" | jq .
```

Revert (server-side copy):

```bash
curl -X POST "http://localhost:3000/api/scorecard/new/versions/123/revert" -H "Authorization: Bearer <token>"
```

## Testing Notes
- Unit test backend service functions that serialize/deserialize `config_json` and that `created_at` is stored in UTC.
- Frontend: add a simple test to `src/stores/scorecard` ensuring `loadScorecard` prepends `original` and `handleVersionChange` loads baseline correctly.

## Rollout Notes
- Release behind feature flag if desired.
- Notify administrators that the UI now supports previewing and restoring baseline defaults.
