# Audit-trail & Baseline Investigation

Status: Draft

Date: 2026-05-08

Owner: Frontend Team / GitHub Copilot (assistant)

## Summary

Users saw incorrect audit-trail messages and dynamically-changing "full details" values when reviewing credit requests. Examples:
- False audit-trail lines: "ปรับวงเงินจาก 500,000 เป็น 300,000" when no real change occurred.
- Full-details (`รายละเอียดคำขอเครดิต`) and summary card (`สรุปข้อมูลคำขอ`) showing edited values instead of the original request snapshot.

This doc captures the investigation, findings, fixes applied, testing steps, and recommended follow-ups.

## Impact

- Misleading audit comments on approve/reject actions (affects audit integrity).
- Confusing UI where original request details are overwritten by edits or submit flow.
- Risk of downstream processes or manual reviewers acting on wrong historical values.

## Reproduction (observed)

1. Open a pending credit request (loaded from API) — original values: amount 500,000; terms 7/7/7.
2. Edit the request locally to amount 1,000,000 and termGS to 15 (do not submit yet).
3. Open Full Details — previously a frozen baseline was shown (expected), but in multiple cases it later showed the edited values.
4. After submitting or saving, the store's `originalTransactionData` and `originalRequestedAmount` became the edited values, causing audit-trail and summary to show the wrong baseline.

## Root causes (findings)

1. Multiple code paths overwrote the store's "original" fields after the first load:
   - `loadRequestDetail()` initially seeded `originalTransactionData` from snapshot data — correct.
   - `createCreditRequest()` and `saveTransactionData()` and other response handling paths sometimes re-seeded original fields from the response payload (post-submit), effectively replacing the true original with the edited state.

2. The UI had mixed sources for display:
   - `ReviewDashboard.vue` summary used a combination of `store.originalRequestedTerms`, comment-parsed values, and `store.transactionData` — causing inconsistent displays.
   - `RequestInfoTab.vue` computed getters sometimes read `store.transactionData` when they should prefer a frozen baseline on read-only/full-details view.

3. No persisted client-side snapshot existed to guarantee original values survive a hard reload or server-returned edited snapshot.

## Changes applied (summary)

Files edited (high level):
- `src/stores/creditRequest.js`
  - Added immutability guards to avoid overwriting `originalTransactionData`, `originalRequestedAmount`, and `originalRequestedTerms` after first load.
  - Added a small localStorage-backed persistence layer to store the first-loaded original snapshot keyed by request id so reloads and post-submit responses do not contaminate the baseline.
  - Removed code paths that re-seeded original fields from responses coming from `createCreditRequest()`.

- `src/components/credit/dashboard/ReviewDashboard.vue`
  - Added `baselineSnapshot` and ensured summary and full-details use a frozen snapshot when opening full details.
  - Adjusted the summary logic to prefer the frozen original terms and avoid displaying redundant "เดิม: ..." when the main display already shows original values.

- `src/components/credit/tabs/RequestInfoTab.vue`
  - Fixed several computed getters and setters (syntax fixes) and updated computed getters (`formattedAmount`, `displayTermGS/AE/YC`) to prefer the passed `baseline` prop when in read-only mode.

- `src/components/credit/dashboard/WorkflowActionBar.vue`
  - Modified audit-trail baseline derivation: prefer `store.originalTransactionData`, fallback to parsing first change comments, then `originalRequestedAmount`/`originalRequestedTerms`.

All changes were committed to branch `fix/audit-trail-baseline` on remote.

## Rationale for approach

- Make the store the single source of truth for the original snapshot and ensure it is set exactly once (on first load) to avoid accidental mutation by later saves or reloads.
- Provide defensive client-side persistence so the first baseline survives reloads where the backend response may reflect the edited state.
- Prefer explicit baseline props for read-only UI components and avoid reactivity that would bind to live-editing state.

## Test plan (manual)

1. Pull the `fix/audit-trail-baseline` branch and run:

   ```bash
   git pull
   npm run dev
   ```

2. Reproduce cases:
   - Case A: Edit local values but do NOT submit. Open Full Details. Confirm Full Details shows original baseline.
   - Case B: Submit/save after edits. Re-open Full Details. Confirm the original baseline still shows the initial original values (the baseline persisted locally).
   - Case C: Reject without changing values. Confirm audit-trail message does not include false "ปรับวงเงินจาก ... เป็น ..." lines.
   - Case D: Pending-requests list summary should show terms from the original baseline.

3. Capture DevTools console logs for the following markers and attach if failures occur:
   - `[ReviewDashboard WATCH]` baseline snapshot logs
   - `[RequestInfoTab formattedAmount GET]` and `displayTerm* GET` logs
   - Audit-trail generation logs from `WorkflowActionBar.vue`

## Known risks & limitations

- Persisting the baseline in `localStorage` is a pragmatic mitigation for the current production responses; it means originals are client-local (not server-trusted) and could be lost if localStorage is cleared. Ideally the backend should return an immutable `original_snapshot` field.
- Comment-parsing fallback used in audit-trail generation depends on comment text format; robust parsing may require stricter server-side snapshot support.

## Next steps / Recommendations

1. Backend: Add and return an explicit, immutable `original_snapshot` on the request record (set when the request is created) and avoid returning edited fields as the original. This is the most robust solution.
2. Tests: Add unit tests for store immutability and for computed getters in the UI components to prevent regressions.
3. Code cleanup: Remove any remaining code paths that attempt to write `original*` fields except in the initial load flow.
4. UX: Consider showing a clear badge 'viewing original snapshot' in the Full Details UI to avoid confusion.

## Lessons learned

- Mutable shared state in a frontend store must have clear ownership and lifetime (set-once vs set-on-update).
- Defensive persistence (e.g., localStorage) can stop regressions quickly but should be replaced with server-side guarantees for correctness.
- Instrumenting logs at key lifecycle points (load, snapshot freeze, save) greatly accelerates root-cause analysis.

## Appendices

### Commits of interest (branch `fix/audit-trail-baseline`)
- Fix: complete missing assignment in formattedAmount setter — RequestInfoTab
- Fix: add missing closing braces for computed term properties — RequestInfoTab
- Fix: keep originalTransactionData immutable to prevent contamination after edits — creditRequest store
- Fix: derive original baseline from comments when originalTransactionData is unavailable/contaminated — WorkflowActionBar
- Fix: persist original request baseline across reloads — creditRequest store (localStorage)
- Fix: freeze review dashboard terms summary to original snapshot — ReviewDashboard
- Fix: stop overwriting original baseline in createCreditRequest — creditRequest store

---
If you want, I can also:
- generate a short PR description summarizing these points,
- add unit tests for `creditRequest` store immutability, or
- open an issue requesting a backend API field `original_snapshot` to make this robust server-side.

---

## Phase 2 Follow-up — Post-Submit Contamination (2026-05-10)

**Status:** Resolved

### Problem (Phase 2)

After the Phase 1 fixes, the UI no longer updated *while typing*. However, subsequent reviewers in the chain (e.g. ผู้พิจารณาฝ่ายขาย loading a request previously modified by ผู้พิจารณาของพื้นที่) still saw the **previous reviewer's modified values** in the Deal Summary and Expanded Details rather than the initiator's original values.

Additionally, the **revise flow** (สร้างคำขอใหม่ (แก้ไข)) pre-filled the form with the last reviewer's rejected values, and even after manually correcting them and submitting, the pending-requests page continued to show the wrong values.

### Diagnostic Method

Added `watch()` diagnostics directly in `ReviewDashboard.vue` targeting `store.transactionData.amount`, `store.transactionData.termGS`, `store.reviewerSuggestion.amount`, and `store.reviewerSuggestion.termGS`. This confirmed:

- `transactionData` was **correctly stable** during typing (only mutated on initial load via `RequestSidebar`)
- `reviewerSuggestion` correctly received typing — **live-typing contamination was already fixed**
- The contamination was happening **after a reviewer submitted** — a persistence problem, not a reactivity problem

### Root Causes (Phase 2)

#### RCA-1: `getSnapshot()` did not embed the initiator's original values

`getSnapshot()` only saved `transaction_data: this.transactionData` (the current, potentially reviewer-modified values). It did **not** include `originalRequestedAmount`, `originalRequestedTerms`, or `originalTransactionData`.

**Effect:** When a reviewer submitted, the snapshot in DB had no record of the initiator's originals. The next reviewer's `loadRequestDetail` would fall to `else` and set `originalRequestedAmount = data.request_amount` — now the reviewer's modified value.

#### RCA-2: `loadRequestDetail` restored `originalTransactionData` from the wrong key

Even after RCA-1 was fixed (so the snapshot now contains `parsedSnapshot.originalTransactionData`), the `else if` branch in `loadRequestDetail` still read from `parsedSnapshot.transaction_data` (current data) instead of `parsedSnapshot.originalTransactionData` (the preserved original).

#### RCA-3: `reviseRequest` backend did not restore original values for old requests

The `reviseRequest` backend relied on `snapshotDataObj.originalTransactionData` to restore the initiator's original into the new draft. For requests submitted **before** the `getSnapshot()` fix, this field doesn't exist, so the revise pre-filled with the reviewer's rejected values.

#### RCA-4: `reviseRequest` carried over original-chain metadata into the revise snapshot

Even after restoring the values, the snapshot still contained `originalRequestedAmount` / `originalTransactionData` from the *previous* review chain. The new revise draft inherited these, causing `loadRequestDetail` to believe the old chain's "original" was this request's original too.

#### RCA-5: `saveTransactionData()` embedded stale `originalTransactionData` on Draft submission

When the initiator manually corrected the revise form and clicked submit, `getSnapshot()` ran and embedded `this.originalTransactionData` — which was still set to the OLD rejected values (loaded from the DB during `loadRequestDetail`). The correct `transactionData` was saved to `request_amount`, but the snapshot's embedded originals were wrong, poisoning all subsequent reviewers.

### Fixes Applied

| # | File | Change |
|---|------|--------|
| 1 | `src/stores/creditRequest.js` — `getSnapshot()` | Embeds `originalRequestedAmount`, `originalRequestedTerms`, and `originalTransactionData` in every snapshot payload |
| 2 | `src/stores/creditRequest.js` — `loadRequestDetail()` | In the `else if` branch and the final fallback: prefer `parsedSnapshot.originalTransactionData` over `parsedSnapshot.transaction_data` |
| 3 | `backend/controllers/creditRequestController.js` — `reviseRequest()` | Added audit trail comment parsing to reconstruct initiator's original amount/terms for old requests. Also deletes original-chain metadata (`originalRequestedAmount`, `originalTransactionData`, `originalRequestedTerms`) from the revise snapshot so the draft starts clean |
| 4 | `backend/controllers/creditRequestController.js` — `reviseRequest()` INSERT | Changed `request_amount` / `term_*` params to read from `snapshotDataObj.transaction_data` (restored values) instead of the now-deleted `originalTransactionData` |
| 5 | `src/stores/creditRequest.js` — `saveTransactionData()` | Before `getSnapshot()` on a Draft submission, syncs `originalTransactionData`, `originalRequestedAmount`, and `originalRequestedTerms` from the current `transactionData`. This ensures the snapshot captures the initiator's actual input as the canonical baseline |

### Lessons Learned (Phase 2)

1. **Snapshot is the source of truth across the reviewer chain.** The `snapshot_data` JSON stored in the DB travels with the request through every reviewer stage. If the "original" fields are not embedded in the snapshot, they are lost permanently at the first reviewer submission.

2. **"Original" means the initiator's first submission, not "what was in the DB when I loaded the page."** The distinction between `originalTransactionData` (what the initiator submitted) and `transactionData` (what the current DB record says, after possible reviewer modifications) is critical. Always embed and preserve the former explicitly.

3. **The revise flow resets the chain.** A revise request is a new initiator submission. The backend must strip all old-chain original metadata from the copied snapshot and restore the correct pre-review values using either `originalTransactionData` (new requests) or audit trail comment parsing (legacy requests).

4. **Draft submission is the moment the "original" is born.** The `saveTransactionData()` call that transitions a Draft to Opened is the canonical moment to capture the initiator's intent. Syncing `originalTransactionData = transactionData` at that exact point ensures every downstream reviewer gets a clean, correct baseline.

5. **Diagnostic watches pay off.** Adding `watch()` directly on store state fields in the ReviewDashboard quickly ruled out live-typing contamination and pointed to the post-submit persistence bug, saving significant debugging time.


## Addendum: Structural Resolution
As of a later patch, the UI requirements were changed to completely remove the incremental `"ปรับวงเงินจาก...เป็น..."` logging logic in favor of logging absolute approved values (`"อนุมัติวงเงินที่..."` and `"อนุมัติเงื่อนไขเครดิตที่..."`) at **every** step of the workflow, effectively eliminating the false positive discrepancy documented here. Legacy parsing code is retained purely for backwards compatibility.
