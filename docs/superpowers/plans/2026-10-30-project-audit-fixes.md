# Project audit fixes implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development and dispatching-parallel-agents for independent modules; root integrates and reviews changes. No commits, push, deployment, or installed-app replacement is part of this task.

**Goal:** Fix the reproducible 2026-10-30 audit findings, prioritize credential and user-file protection, then run complete verification.

**Architecture:** Enforce redirects at the actual MCP fetch boundary; use content identities and conservative legacy handling in rewind; coordinate update state transitions. Keep UI tests aligned with actual interactions without relaxing product contracts. Upgrade dependencies through isolated installation, preserve major APIs where possible, and remove unused vulnerable dependencies rather than force-downgrading functionality.

**Tech stack:** TypeScript, Electron, React, Vitest, Playwright, npm.

## Tasks

- [x] MCP: add local HTTP cross-origin regression tests in `tests/mcp`, observe failure, guard both HTTP/SSE paths in `src/mcp`, preserve recovery/cancellation, run MCP suite.
- [x] Rewind: add same-size/preserved-mtime user-edit and legacy/TOCTOU tests in `tests/project/checkpoints.test.ts`, observe failure, strengthen content identity in `src/project/checkpoints.ts`, run all project tests.
- [x] Updates: add deferred-source preference/download races in `tests/update/检查.test.ts`, observe failure, coordinate `src/update/检查.ts`/service state, run update suite.
- [x] Tooling: repair `scripts/smoke-native.ts` with isolated credential injection and current `native` spec; include scripts/root configs in `tsconfig.json`; align Node engines/docs/CI with dependencies.
- [x] Dependencies: make this project's node_modules independent from DAWN; review npm audit fixes, upgrade supported dependency lines and transitive patches, remove unused simple-git, verify clean installation and native modules. Do not use audit fix --force or disable audit findings.
- [x] UI/test maintenance: fix route PDF usable height in `src/ui/styles.css`; update stale E2E selectors/menu paths/shortcut assertions to current UI, retain functional assertions; investigate scroll-edge and hover-card failures. Replace title-based exclusion with spec isolation so all E2E tests run.
- [x] Bot/CI: prevent non-native sessions from entering Bot delivery; add a meaningful regression; isolate CI node/ui runs and investigate Linux stall evidence rather than raising timeouts.
- [x] Review each changed subsystem against the audit and inspect diffs; resolve review findings before final verification.
- [x] Run `npm run typecheck`, `npm test`, `npm run build`, full normal and kernel E2E, dependency audit, and native packaged CLI/application self-test. Record exact skips, failures, platform limits, and audit disposition in `docs/reviews/2026-10-30-project-audit.md`.

## Verification discipline

Security/state regressions must be red before production edits, then green. UI changes retain minimum height/scroll/focus protections. Tests use mock providers and temporary directories. Generated screenshots are restored to their original Git versions unless a visually inspected baseline update is deliberately required. Linux CI cannot be claimed fixed solely from macOS tests; reproduce in a suitable environment or clearly retain that validation limitation.

## Completion evidence

Final source validation completed on 2026-10-31: 553 Vitest files, 5820 passed and 10 environment-conditional skips covered by a supplementary 73-test run; full ordinary Electron 899 passed / 1 existing design skip, real kernel 6/6 passed. Public npm run test:e2e completed with exit 0. Strict visual 28/28, packaged CLI and 7 app self-tests passed. Root/production/two spike audits are zero. Linux runner and non-macOS desktop acceptance remain explicitly unverified; no commit, push, release or installed-app replacement.
