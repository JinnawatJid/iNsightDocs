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
