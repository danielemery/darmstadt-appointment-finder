# TASKS.md

Long-living improvement backlog for this project. Persists across branches —
do not delete on branch wrap-up (declared in `AGENTS.md`). Move items between
sections as work progresses; add a date when completing.

## In progress

_(nothing)_

## Needed — rot and correctness

- [ ] **Verify the scraper still works against the live site.** Run
  `npm run start:dev` (headful if needed) and walk the tevis booking flow
  manually; fix any selectors in `src/routes.ts` that have drifted since 2023.
  This gates everything else — no point modernising a scraper that no longer
  scrapes.
- [ ] **Upgrade the runtime.** Base image `apify/actor-node-playwright-chrome:18`
  is Node 18 (EOL April 2025). Move to a current LTS image, bump
  `@types/node` to match.
- [ ] **Pin and update dependencies.** `playwright` is `*` (takes whatever the
  base image ships); pin it to the version matching the new base image.
  Update Crawlee 3.x and TypeScript to current, regenerate lockfile.
- [ ] **Validate env vars at startup.** `GOTIFY_URL`, `GOTIFY_TOKEN`, and
  `HEALTHCHECKS_IO_SLUG` are read but never checked; a missing value today
  only surfaces as a failed fetch at the end of a run. Fail fast with a clear
  message in `src/main.ts`.
- [ ] **Signal failures to healthchecks.io explicitly.** Today any selector
  breakage means silence (missed heartbeat) — works, but slow to alarm and
  indistinguishable from the cron not firing. Catch handler errors and ping
  `https://hc-ping.com/<slug>/fail` so breakage alarms immediately.

## Wanted — hygiene and tooling

- [ ] **Nix development flake.** Add a `flake.nix` with a devShell providing
  Node, npm, and Playwright browser dependencies for local dev (operator's
  primary machines run NixOS). Playwright on nix needs care: browsers should
  come from nixpkgs (`playwright-driver.browsers` +
  `PLAYWRIGHT_BROWSERS_PATH`), matched to the pinned playwright npm version,
  rather than `npx playwright install`.
- [ ] **Evaluate whether Crawlee is overkill.** The app visits one URL and
  drives a single deterministic flow — no crawling, no queue, no dataset
  (the only `Dataset` use is in dead boilerplate). Plain Playwright would
  likely halve the dependency tree and remove the `storage/` state quirk.
  Decide before doing the dependency pin/update pass, since the outcome
  changes what gets pinned.
- [ ] **CI on push/PR.** Nothing runs before a release tag today. Add a
  workflow running the canonical verify (`npm run build`, plus lint once it
  exists) on every push and PR.
- [ ] **Add a linter.** No lint today; add ESLint (typescript-eslint) and fold
  it into the canonical verify command.
- [ ] **Remove the unused `detail` route handler** in `src/routes.ts` —
  leftover Crawlee template boilerplate, never routed to.
- [ ] **Trim the Dockerfile final stage.** It copies the full source tree into
  the runtime image after installing prod deps; only `dist/` and
  `package*.json` are needed.

## Wanted — features

- [ ] **Config file for watched appointments.** Read a config file at startup
  (path via env var, mounted into the container) declaring a list of watched
  appointment types. Each entry names the target service — office, service
  category, concern, today hardcoded German strings in `src/routes.ts` — and
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
