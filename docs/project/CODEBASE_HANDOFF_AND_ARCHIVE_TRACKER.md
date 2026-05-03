# Codebase Handoff and Archive Tracker

This document is a practical, industry-style tracker for handing this system to another team or preparing it for archive.

Use this file as a single source of truth during review prep.
- Mark each task when completed.
- Add the owner, date, and evidence link (PR, commit, screenshot, or doc).
- Keep "Blocked" notes explicit so reviewers can see what is pending and why.

## Cloud Agent Context Prompt

Use the text below when starting a cloud agent or remote review agent.

### Prompt
You are reviewing the iNsightDocs repository to prepare it for a professor review, team handoff, or archive.

Context:
- Repository name: iNsightDocs
- Main stack: Vue 3 frontend in `src/` and Node/Express backend in `backend/`
- Documentation already exists under `docs/`, including release, project structure, testing, and readiness notes
- The goal is not to rewrite the whole system, but to identify the minimum set of changes needed to make the codebase look professional, maintainable, and safe to hand to another team

What to look for:
- Tracked secrets, generated files, build artifacts, and local-only data that should not be in Git
- Security debt in backend auth, cookie handling, route protection, and environment handling
- Missing CI, test coverage gaps, script inconsistencies, and obvious developer-experience issues
- Debug code, temporary scripts, old patches, duplicate utilities, and files that should be archived or removed
- Documentation gaps for onboarding, operations, release process, and archive readiness

How to work:
- Start with the most concrete evidence available in the repository
- Prefer targeted findings over broad speculation
- Report issues with file paths and a short explanation of why they matter
- Separate urgent fixes from nice-to-have cleanup
- If a change is risky or outside scope, document it as deferred rather than silently ignoring it

Expected output:
- A prioritized list of findings
- A short recommendation for what should be fixed before review
- A separate list of items that can wait until after handoff
- If possible, map each finding to a file, folder, or doc section that should be updated

When using this tracker, update the checklist with the agent’s findings and mark each item with status, owner, date, and evidence.

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Done
- [!] Blocked

## 24-Hour Priority Plan (Professor Review Ready)

### 1) Repository Hygiene
- [ ] Remove tracked sensitive/generated files from Git tracking (without deleting local working copies):
  - `.env`
  - `database.sqlite`
  - `production_fix.zip`
- Owner:
- Target date:
- Evidence:

- [ ] Verify `.gitignore` covers local env, build output, DB files, and release artifacts.
- Owner:
- Target date:
- Evidence:

### 2) Security Baseline
- [ ] Resolve or formally document security TODOs in backend startup/auth flow:
  - RBAC strategy
  - JWT signature validation method
  - Secure auth cookie policy (`HttpOnly`, `Secure`, `SameSite`)
- Owner:
- Target date:
- Evidence:

- [ ] Add a "Known Security Limitations" section in docs if any item is intentionally deferred.
- Owner:
- Target date:
- Evidence:

### 3) CI and Quality Gates
- [ ] Add CI workflow for at least install + test + build on pull request.
- Owner:
- Target date:
- Evidence:

- [ ] Ensure root and backend scripts are standardized (`dev`, `test`, `build`, optional `lint`).
- Owner:
- Target date:
- Evidence:

### 4) Handoff Documentation
- [ ] Create a concise handover summary page with:
  - system topology
  - external dependencies
  - startup order
  - known risks and mitigations
- Owner:
- Target date:
- Evidence:

## Full Industry-Standard Checklist

## A. Code and Repo Standards
- [ ] Branch protection and PR review policy documented.
- [ ] Clear commit history for handoff scope (no mixed unrelated changes).
- [ ] No generated binaries/build artifacts tracked in source control.
- [ ] No secrets committed (tokens, credentials, private URLs).
- [ ] Dependency boundaries are clear (frontend vs backend ownership).
- [ ] One consistent script contract across packages.

## B. Security and Compliance
- [ ] Authentication and authorization responsibilities are explicit.
- [ ] API exposure documented (public vs protected endpoints).
- [ ] Environment variable contract documented (`.env.example` or equivalent).
- [ ] Data retention and log retention policies documented.
- [ ] Access control for production service account documented.

## C. Testing and Reliability
- [ ] Critical business paths covered by tests.
- [ ] Smoke test list for production handoff exists and is repeatable.
- [ ] Health check endpoint is documented and monitored.
- [ ] Known flaky tests are either fixed or explicitly quarantined.

## D. Operational Readiness
- [ ] Build and release process documented and reproducible.
- [ ] Rollback procedure documented and tested.
- [ ] Backup/restore procedure documented.
- [ ] Runtime prerequisites documented (OS, Node version, external services, network).
- [ ] Logging format and log locations documented for incident support.

## E. Documentation Quality
- [ ] README gives a quick-start path for new developers.
- [ ] Architecture docs reflect current implementation (not outdated).
- [ ] API references and data model docs are current.
- [ ] Ownership map (RACI/contact points) is current.
- [ ] Open debt list exists with target dates and owners.

## F. Archive Readiness (If Project Is Frozen)
- [ ] Create a final tagged release and changelog snapshot.
- [ ] Freeze dependencies and record exact versions.
- [ ] Export final environment templates (sanitized).
- [ ] Snapshot key docs (architecture, release, operations, testing).
- [ ] Record unresolved defects and business impact.
- [ ] Record reactivation guide (how to revive project later).

## Evidence Log
Use this section to log completion details quickly.

| Date | Item | Status | Owner | Evidence |
|---|---|---|---|---|
| YYYY-MM-DD | Example: Removed tracked .env from Git index | Done | Name | PR #123 |

## Blockers and Decisions
- Blocker:
  - Impact:
  - Decision needed:
  - Decision owner:
  - ETA:

## Notes for Reviewer Session
- Keep this section brief and factual.
- Mention what is complete, what is deferred, and why.
- Link evidence for each high-risk item.
