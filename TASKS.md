# TASKS.md

Long-living improvement backlog for this project. Persists across branches —
do not delete on branch wrap-up (declared in `AGENTS.md`). Move items between
sections as work progresses; add a date when completing.

## In progress

_(nothing)_

## Backlog

- [ ] **Cut v0.1.0** once pushed and CI is green. The `deploy/` base pins
  the v0.1.0 image tag, so the flux-cd deployment only works once that
  release exists.
- [ ] **Cut v1.0.0** once v0.1.0 has proven itself in production (cron
  running, heartbeats green, at least one real notification observed).
  Bump the image tag in `deploy/cronjob.yaml` as part of the release.

## Done

- [x] 2026-07-15 — Kustomize base in `deploy/`: CronJob every 10 minutes,
  no retries/overlap, image pinned to v0.1.0, config mounted from ConfigMap
  `darmstadt-appointment-finder-config` at `/config/config.json`, env from
  Secret `darmstadt-appointment-finder-env` (contract documented in README;
  a separate flux-cd repo supplies both plus the namespace). `kustomize
  build` folded into `npm run verify` via flake-provided kustomize.

- [x] 2026-07-15 — Failures now signal healthchecks.io explicitly: entry
  errors are collected (entries are checked independently) and the run pings
  `/fail` with the error details as the POST body, so breakage alarms
  immediately instead of via a missed heartbeat. Success pings as before,
  with a summary body.
- [x] 2026-07-15 — Added `AGENTS.md` documenting current project state.
- [x] 2026-07-15 — Added `.tmp/` to `.gitignore`.
- [x] 2026-07-15 — Nix development flake: devShell with Node 24 and
  nixpkgs-provided Playwright browsers; playwright pinned to 1.61.1 and
  `@types/node` bumped to 24 to match; tsconfig fixed (`lib` was `["DOM"]`
  only) and `skipLibCheck` enabled for the Crawlee-3-vs-playwright-1.61
  type clash.
- [x] 2026-07-15 — CI workflow (`verify.yml`): push-to-main and PRs run
  `npm run verify` through a new lightweight `ci` devShell (same nixpkgs
  toolchain, no Playwright browsers closure). Commands verified locally;
  first real run happens on push.
- [x] 2026-07-15 — Added Biome (2.5.0 from the nix flake — the npm binary
  can't run on NixOS; `biome.json` schema version tracks nixpkgs). New
  canonical verify command: `npm run verify` (build + lint). Applied
  formatting and lint fixes across the repo.
- [x] 2026-07-15 — Config file for watched appointments (`src/config.ts`,
  `config.example.json`, `CONFIG_PATH` env var): per-entry office/category/
  concern + Apprise URLs, `${VAR}` env interpolation for secrets (SOPS →
  container env), fail-fast validation of config and env vars at startup.
  One run checks every entry in a fresh browser context. Dissolved
  `APPRISE_NOTIFY_URLS`; verified locally and in the container with a
  mounted config.
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
