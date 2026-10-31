# Installation onboarding implementation plan

**Goal:** Every new installation starts the four-step wizard at welcome, independently of saved credentials.

**Architecture:** Main derives a stable identity for one installation; preload exposes only the opaque ID. The renderer scopes completion flags to it and keeps the wizard mounted until an explicit completion/skip.

**Tech Stack:** Electron, React, TypeScript, Vitest, Playwright, NSIS.

1. Reproduce with App tests: existing valid credentials must leave welcome visible; successful delayed verification must not close it. Add scoped-storage cases for old global flags, same-install restart and a second installation.
2. Add `src/electron/installation-id.ts` and real temporary-file tests: stable restarts, same-version replacement, Windows GUID changes and portable source exe. Main sends `--ecoai-installation-id=<hash>` via `additionalArguments`; preload exposes `installationId`. Development retains unscoped storage and permits `DAWN_ONBOARDING_INSTALLATION_ID` for isolated tests.
3. Add `packaging/installer.nsh`, referenced by `nsis.include`, generating a fresh GUID inside resources after manual NSIS installs; --updated preserves it via a dedicated registry value. macOS/Linux bind the new physical ID to the old onboarding scope only after successful in-app replacement. Compile a minimal NSIS harness with the cached native makensis. Add renderer key scoping and initialize the wizard latch with `!读跳过()`.
4. Extend Electron regressions to cover old flags plus recovered credentials, explicit completion/restart, and a changed installation ID. Re-run `vitest --project ui`, relevant Node tests, `npm run typecheck`, `npm run build`, and the four existing onboarding/i18n Electron specs.
5. Build a separate macOS directory package, run the install identity/first-run checks in a temporary profile, and inspect screenshots. Review the diff, commit and fast-forward local main; rebuild and run targeted merged checks. Retain all real user data and do not push or replace the installed application.
