# TASKS.md

Long-living improvement backlog for this project. Persists across branches —
do not delete on branch wrap-up (declared in `AGENTS.md`). Move items between
sections as work progresses; add a date when completing.

## In progress

_(nothing)_

## Needed — rot and correctness

- [ ] **Validate env vars at startup.** Folds into the config-file item:
  config validation covers the appointment/notification setup, and the
  remaining env vars (`HEALTHCHECKS_IO_SLUG`) get checked alongside it.
- [ ] **Signal failures to healthchecks.io explicitly.** Today any selector
  breakage means silence (missed heartbeat) — works, but slow to alarm and
  indistinguishable from the cron not firing. Catch handler errors and ping
  `https://hc-ping.com/<slug>/fail` so breakage alarms immediately.

## Wanted — hygiene and tooling

- [ ] **CI on push/PR.** Nothing runs before a release tag today. Add a
  workflow running the canonical verify (`npm run build`, plus lint once it
  exists) on every push and PR.
- [ ] **Add a linter.** No lint today; add ESLint (typescript-eslint) and fold
  it into the canonical verify command.

## Wanted — features

- [ ] **Config file for watched appointments.** Read a config file at startup
  (path via env var, mounted into the container) declaring a list of watched
  appointment types. Each entry names the target service — office, service
  category, concern, today hardcoded German strings in `src/darmstadt.ts` — and
  the list of Apprise URLs to fire when a slot appears (dissolving the
  interim `APPRISE_NOTIFY_URLS` env var). One run checks every entry.
  Validate the config at startup and fail fast on errors — this also covers
  the remaining unvalidated env vars (`HEALTHCHECKS_IO_SLUG`).
  Supersedes the hardcoded single-service flow.

## Done

- [x] 2026-07-15 — Added `AGENTS.md` documenting current project state.
- [x] 2026-07-15 — Added `.tmp/` to `.gitignore`.
- [x] 2026-07-15 — Nix development flake: devShell with Node 24 and
  nixpkgs-provided Playwright browsers; playwright pinned to 1.61.1 and
  `@types/node` bumped to 24 to match; tsconfig fixed (`lib` was `["DOM"]`
  only) and `skipLibCheck` enabled for the Crawlee-3-vs-playwright-1.61
  type clash.
- [x] 2026-07-15 — Notifications moved from bespoke Gotify to an Apprise API
  server (`src/notify.ts`, interim `APPRISE_URL`/`APPRISE_NOTIFY_URLS` env
  vars) with richer message (booking link; priority via Apprise URL params).
  Failed delivery now fails the run (non-2xx throws). Dev `compose.yaml`
  provides a local Apprise + echo sink; delivery and failure paths verified
  against it.
- [x] 2026-07-15 — Fixed selectors against the live site; first working run
  since 2023 (locally and in the container). Site changes handled: cookie
  banner is now an `Akzeptieren` button; "Weiter" lost its aria-label and
  needs an exact role match (concern counters substring-match it via
  "Erweiterung"); a new location-selection step sits between the concern
  dialog and the appointment suggestions.
- [x] 2026-07-15 — Container runtime moved to
  `mcr.microsoft.com/playwright:v1.61.1-noble` (tag must track the pinned
  playwright version). Final stage carries only prod deps + `dist/`, xvfb
  wrapper gone. Verified: container reaches the live site and fails only at
  the known selector drift.
- [x] 2026-07-15 — Updated TypeScript to 7.0.2 and replaced `@apify/tsconfig`
  with a self-contained `tsconfig.json` (NodeNext, strict; `types: ["node"]`
  is required — TS 7 doesn't auto-include `@types/node` here).
- [x] 2026-07-15 — Removed Crawlee (and with it the unused `detail` handler
  and the `storage/` state quirk): plain Playwright in `src/main.ts` +
  `src/darmstadt.ts`. Also dropped ts-node (broken on Node 24) and dotenv —
  `start:dev` now builds and runs with node's `--env-file-if-exists`.
  Dependency tree went from 283 packages to 7.
