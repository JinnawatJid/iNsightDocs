# Pending Requests Visibility Policy

## Purpose
Define the current queue visibility and editability rules for `/pending-requests` so behavior is consistent across implementation, UAT, and future changes.

## Core Rules
1. Final states (`Approved`, `Rejected`, `Closed`, `Canceled`) are shown in History, not Pending.
2. Pending queue visibility is role-dependent.
3. Editability is stricter than visibility: a user can edit/approve only when their role is actionable for the current request state.

## Visibility Matrix (Pending Tab)
1. Initiator (`ผู้สร้างคำขอ (เครดิตใหม่/ปรับปรุง)`):
   - Sees tracked non-final requests (excluding `Draft`).
   - Tracking view is read-only.
2. Regional Manager (`ผู้พิจารณาของพื้นที่`):
   - Sees actionable queue only (typically `Opened`, with region/branch constraints).
3. Approver-chain broad visibility roles:
   - `ผู้พิจารณาฝ่ายขาย`
   - `ผู้ตรวจสอบเอกสาร`
   - `ผู้อนุมัติ (วงเงินต่ำกว่าเกณฑ์)`
   - `ผู้อนุมัติ (วงเงินสูงกว่าเกณฑ์)`
   - These roles can view all non-final queue items in Pending.

## Editability Rules
1. Request detail is editable only if the current state includes the user role in `actionableByRoles` from `WORKFLOW_CONFIG`.
2. If the request state is not actionable for the current role, detail inputs are read-only and workflow action buttons are hidden/disabled.
3. This ensures users can monitor broader queue health without performing unauthorized transitions.

## Configuration Source
1. Workflow states and actionability come from `WORKFLOW_CONFIG`.
2. Broad visibility role list is maintained in frontend policy constants and should be kept aligned with business approval-chain definitions.

## Verification Checklist
1. Each broad-visibility role can see non-final requests in Pending.
2. Each role can perform workflow actions only on requests in its responsible state.
3. Non-responsible states render read-only for that role.
4. Final states remain only in History.