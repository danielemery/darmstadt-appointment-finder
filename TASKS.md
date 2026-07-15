# TASKS.md

Long-living improvement backlog for this project. Persists across branches —
do not delete on branch wrap-up (declared in `AGENTS.md`). Move items between
sections as work progresses; add a date when completing.

## In progress

_(nothing)_

## Needed — rot and correctness

- [ ] **Fix selectors against the live site.** Confirmed broken 2026-07-15:
  the cookie banner is now `Akzeptieren`/`Ablehnen` inputs without
  aria-labels, so the flow dies at step one. The site itself is up and
  recognizable (office buttons like "Fahrerlaubnisbehörde" still present;
  there is also a dismissable info modal, "Hinweisfenster schließen", that
  may need handling). Walk the flow headful (`HEADFUL=1 npm run start:dev`)
  and fix each selector in `src/darmstadt.ts`; landing-page screenshot from
  the check is at `.tmp/landing.png`.
- [ ] **Upgrade the container runtime.** Base image
  `apify/actor-node-playwright-chrome:18` is Node 18 (EOL April 2025).
  Decided 2026-07-15: with Crawlee gone, move to
  `mcr.microsoft.com/playwright` (official Playwright image), tag matching
  the pinned playwright version (currently v1.61.1). **Known-broken until
  then:** local dev is Node 24 + playwright 1.61.1, which mismatches the
  base image's Node 18 and its preinstalled browsers — the Docker image
  should be assumed non-functional until this lands (accepted 2026-07-15).
- [ ] **Validate env vars at startup.** `GOTIFY_URL`, `GOTIFY_TOKEN`, and
  `HEALTHCHECKS_IO_SLUG` are read but never checked; a missing value today
  only surfaces as a failed fetch at the end of a run. Fail fast with a clear
  message in `src/main.ts`.
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
- [ ] **Trim the Dockerfile final stage.** It copies the full source tree into
  the runtime image after installing prod deps; only `dist/` and
  `package*.json` are needed.

## Wanted — features

- [ ] **Config file for watched appointments.** Read a config file at startup
  (path via env var, mounted into the container) declaring a list of watched
  appointment types. Each entry names the target service — office, service
  category, concern, today hardcoded German strings in `src/darmstadt.ts` — and
  the list of notification URLs to fire when a slot appears. One run checks
  every entry. Validate the config at startup and fail fast on errors.
  Supersedes the hardcoded single-service flow.
- [ ] **Notify via an Apprise server.** Replace the direct Gotify call with
  POSTs to an Apprise API server, so any of Apprise's notification backends
  can be used. The per-appointment notification URLs from the config file are
  Apprise URLs (e.g. `gotify://…`), so the bespoke Gotify integration and its
  env vars can be dropped. Depends on the config-file item.
- [ ] **Richer notification.** Include the booking URL in the message so a
  tap lands on the reservation page, and use a high priority so it bypasses
  quiet hours — these appointments disappear fast.

## Done

- [x] 2026-07-15 — Added `AGENTS.md` documenting current project state.
- [x] 2026-07-15 — Added `.tmp/` to `.gitignore`.
- [x] 2026-07-15 — Nix development flake: devShell with Node 24 and
  nixpkgs-provided Playwright browsers; playwright pinned to 1.61.1 and
  `@types/node` bumped to 24 to match; tsconfig fixed (`lib` was `["DOM"]`
  only) and `skipLibCheck` enabled for the Crawlee-3-vs-playwright-1.61
  type clash.
- [x] 2026-07-15 — Updated TypeScript to 7.0.2 and replaced `@apify/tsconfig`
  with a self-contained `tsconfig.json` (NodeNext, strict; `types: ["node"]`
  is required — TS 7 doesn't auto-include `@types/node` here).
- [x] 2026-07-15 — Removed Crawlee (and with it the unused `detail` handler
  and the `storage/` state quirk): plain Playwright in `src/main.ts` +
  `src/darmstadt.ts`. Also dropped ts-node (broken on Node 24) and dotenv —
  `start:dev` now builds and runs with node's `--env-file-if-exists`.
  Dependency tree went from 283 packages to 7.
