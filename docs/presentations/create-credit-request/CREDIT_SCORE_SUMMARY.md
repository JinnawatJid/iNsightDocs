# CreditScoreSummary Component — Overview & Component Map
> `src/components/credit/scoring/CreditScoreSummary.vue`

---

## Component Map (ภาพรวม)

```
[CreditScoreSummary.vue]  ← display + scoring override UI + recalc hooks
     │
     ├── src/stores/creditRequest.js    ← source of truth: `creditScore`, `transactionData`, `requestStatus`
     ├── src/stores/auth.js / src/stores/rbac.js ← permission checks (hide values / override)
     ├── parent view props: `financial`, `canRequest`, `badges`, `suggestions` (from CreateCreditRequest view)
     └── emits: `recalculate` (used to request preview or save overrides)
```

---

## ไฟล์ที่เกี่ยวข้องและหน้าที่

| ไฟล์ | Layer | หน้าที่ |
|---|---|---|
| `src/components/credit/scoring/CreditScoreSummary.vue` | Frontend / Component | แสดงผลคะแนนเครดิต, แสดงวงเงินแนะนำ, พฤติกรรมการซื้อ, คำแนะนำ และ UI สำหรับปรับน้ำหนักโมเดล |
| `src/stores/creditRequest.js` | Frontend / Store | ให้ `creditScore`, `transactionData`, และ status ที่ใช้ควบคุมการแสดงผล |
| `src/stores/auth.js`, `src/stores/rbac.js` | Frontend / Store | ควบคุมการซ่อนค่าและสิทธิ์การปรับคะแนน (`hideCreditScoreEnabled`, roles)
| Parent view (`CreateCreditRequest.vue`) | Frontend / View | ส่ง `financial`, `badges`, `suggestions`, `canRequest` เป็น props ให้ component |

---

## CreditScoreSummary — แสดงอะไรบ้าง

| ส่วน | แหล่งข้อมูล | เงื่อนไข/หมายเหตุ |
|---|---|---|
| คะแนนรวม (`totalScore`) + เกรด | `store.creditScore` (via computed) | แสดง circle และ badge; class จาก `getGradeClass(grade)` |
| วงเงินแนะนำ (`recommendedLimit`) | `creditScore.recommendedLimit` | แสดง breakdown ถ้ามี `guaranteeAmount` |
| ส่วนประกอบคะแนน (C1/C2/C3) | `creditScore.breakdown` | แสดงค่า `total` ของแต่ละคีย์ย่อย |
| พฤติกรรมการซื้อ (total_purchase_3_months, avg_monthly, trends) | `financial` prop | มี toggle รายเดือนและ category breakdown |
| Badges / Can request indicator | `badges` + `canRequest` props | แสดงว่าลูกค้าสามารถขอเครดิตใหม่ได้หรือไม่ |
| Suggestions list | `suggestions` prop | ถูก sort ด้วย heuristic keywords (positive / warning / negative)
| Blacklist warning | `financial.is_blacklisted` | แสดง panel เตือนเมื่อเป็น NPL |

---

## Interaction & Recalculation flow

- Override modal: visible to privileged roles (`canOverrideScore`) — allows editing `customWeights` and `max_score_factors`.
- When user edits weights, `fetchPreviewScore()` debounced calls emit `recalculate` with `preview: true` and callback; parent/consumer handles request and invokes callback with preview result.
- Saving override emits `recalculate` with `custom_weights`/`max_score_factors` and updates `store.transactionData` via `store.updateTransactionData()`.
- `shouldHideValues` computed hides the score UI when `authStore.hideCreditScoreEnabled && rbac.hasPermission('create_request') && store.requestStatus !== 'Approved'`.

---

## Notable implementation details

- Sorting suggestions uses simple keyword heuristics (positive/negative/warning) implemented in `sortedSuggestions` and `getSuggestionClass`.
- Preview computation is asynchronous and relies on a `recalculate` event with a callback payload; the component does not call the API directly for scoring.
- Weight editing enforces total weight == 200 (`isWeightsValid`) and shows preview results comparing old vs new score.
- Default weights are loaded from `/api/scorecard/:modelType` via `loadDefaultWeights()` and mapped into `defaultWeights`.

---

## Edge cases & review checklist

- Permissions & hiding: confirm intended policy for `shouldHideValues` (which hides scores for non-approved requests even if user has `create_request`). Document expected behavior.
- Recalculate contract: the component emits `recalculate` and expects a callback; ensure all parents/listeners implement the callback contract to avoid broken previews.
- Weight validation: UI requires sum == 200 (±0.01). Ensure that backend accepts `custom_weights` format and that rounding does not lead to rejection.
- Race conditions: debounced preview and manual save may overlap — ensure `isPreviewLoading`/`isRecalculating` states prevent conflicting updates.
- Error handling: API errors in `loadDefaultWeights` and preview are console.logged only — consider surfacing failures to the user.
- i18n: many text strings are hard-coded in Thai; ensure localization strategy is consistent across app.

---

## Suggested small improvements

- Centralize the `recalculate` event contract in a composable or service so behavior and payload shape are documented and testable.
- Surface failures from `loadDefaultWeights` and preview to UI (Swal or inline message) instead of only console.error.
- Add unit tests for `sortedSuggestions` and `getSuggestionClass` heuristics to prevent regressions.
- Add accessibility improvements to modal (focus trap, ESC closes, proper ARIA roles).
- Consider caching `/api/scorecard/:modelType` responses to reduce repeated network calls when multiple users view the same model.

---

## Suggested tests

- Unit tests:
  - `getGradeClass()` returns expected classes for A/B/C
  - `formatDecimal` / `formatNumber` behaviors for null/string/number inputs
  - `sortedSuggestions` ordering given sample suggestions
  - `isWeightsValid` true only when sum ≈ 200

- Integration tests:
  - `openOverrideModal()` loads defaults and sets `customWeights`
  - `fetchPreviewScore()` emits `recalculate` and handles callback result
  - `saveOverride()` updates `store.transactionData` with `custom_weights` and `max_score_factors`

---

## Quick reference links

- Source: [src/components/credit/scoring/CreditScoreSummary.vue](src/components/credit/scoring/CreditScoreSummary.vue#L1-L200)
- Store: [src/stores/creditRequest.js](src/stores/creditRequest.js#L1-L260)
- Parent usage: [src/views/CreateCreditRequest.vue](src/views/CreateCreditRequest.vue#L1-L220)

---

Would you like me to:
- add unit test stubs for `sortedSuggestions`, `isWeightsValid`, and `getGradeClass`, or
- implement the `recalculate` contract documentation and a small helper in `src/services/` to centralize the payload shape?
