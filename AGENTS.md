# AGENTS.md

Project context for agents working in this repo. Process rules live in the
operator's global `AGENTS.md`; this file is project facts only.

## What this is

A web scraper that checks the Darmstadt public office booking site
(`https://tevis.ekom21.de/stdar`) for appointment availability. The watched
appointment types are declared in a JSON config file (see
`config.example.json`); string values in it may reference env vars as
`${VAR}` so secrets stay out of committed config (deployed via SOPS-provided
container env). It is packaged as a Docker image intended to be run
periodically by an external cron — the app checks every configured
appointment once and exits.

For each configured appointment it:

1. Drives the booking flow with Playwright (accept cookies → pick office →
   expand service category → increment the concern counter → continue →
   confirmation dialog, shown only for concerns with a "Hinweis" notice →
   location selection → continue).
2. Looks for the text "Kein freier Termin verfügbar". If absent, an
   appointment is assumed available and the entry's Apprise URLs are notified
   through an **Apprise API** server (delivery priority is encoded per target
   in the Apprise URL, not in code).

Entries are checked independently — a failure in one (broken flow or failed
notification) doesn't stop the others. The run signals **healthchecks.io** at
both ends: a best-effort `/start` ping before the checks (paired with the
finishing ping, healthchecks records each run's duration), then after all
entries a plain ping (`https://hc-ping.com/<slug>`) when everything
succeeded, or the `/fail` endpoint with error details in the POST body when
anything failed (plus a non-zero exit), so breakage alarms immediately.

## State of the repo (as of 2026-07)

- Dormant 2023–2026, modernised and working again as of 2026-07-15; see
  `TASKS.md` for the remaining backlog.
- **The scraper is selector-driven against a third-party site.** The German
  text selectors and aria-labels in `src/darmstadt.ts` are the fragile
  surface; the site drifted once already (2023→2026: new cookie banner, new
  location-selection step, "Weiter" lost its aria-label). Verify against the
  live site after any change to the flow.
- Failures signal healthchecks.io explicitly via the `/fail` endpoint (with
  error details in the body). The missed-heartbeat alarm remains the backstop
  for the cases that can't ping: cron not firing, or startup failing before
  config/env validation passes.
- The toolchain is fully modernised (Node 24 + playwright 1.61.1 locally via
  the nix flake; `mcr.microsoft.com/playwright:v1.61.1` in the container).
  Constraint: the Docker base image tag, the `playwright` version in
  `package.json`, and nixpkgs' `playwright-driver` must all stay on the same
  version.

## Layout

| Path | Purpose |
|---|---|
| `src/main.ts` | Entry point: loads config, launches Chromium, checks each entry (fresh context per entry), notifies, heartbeats. |
| `src/darmstadt.ts` | Drives the tevis booking flow for one appointment and returns whether a slot is available. |
| `src/notify.ts` | Sends notifications through an Apprise API server's stateless notify endpoint. |
| `src/config.ts` | Loads, env-interpolates, and validates the JSON config; also `requireEnv`. |
| `config.example.json` | Example config; the real (gitignored) `config.json` is mounted into the container. |
| `compose.yaml` | Dev-only: local Apprise server + HTTP echo sink for observing notifications. |
| `Dockerfile` | Two-stage build on `mcr.microsoft.com/playwright:v1.61.1-noble`; final stage holds prod deps + `dist/` only. |
| `.github/workflows/publish.yml` | On pushing a `v*.*.*` tag, builds and pushes the image to GHCR (`ghcr.io/<repo>`). |
| `.github/workflows/verify.yml` | On push to main and PRs, runs `npm run verify` through the flake devShell (nix store cached). |
| `deploy/` | Kustomize base (CronJob, every 10 min) consumed by a separate flux-cd repo, which supplies namespace, config ConfigMap, and env Secret (names documented in README). |
| `fixtures/` | Recorded HAR of the booking flow + metadata, replayed by `src/darmstadt.test.ts`; re-record via `npm run fixtures:record`. |
| `scripts/record-har.mjs` | Records the live flow into `fixtures/` using the real `checkAppointmentAvailable`. |
| `.env.example` | Template for the three required env vars. |

## Configuration

All config is via environment variables (loaded from `.env` via node's
`--env-file-if-exists` in dev mode only; in the container they must be
provided by the runtime):

- `APPRISE_URL` — base URL of the Apprise API server.
- `HEALTHCHECKS_IO_SLUG` — healthchecks.io check slug for the heartbeat ping.
- `CONFIG_PATH` — optional, path to the config file (default `./config.json`;
  the container mounts it at `/app/config.json`).
- Any variables referenced as `${VAR}` inside the config file.

Env vars and config are validated at startup and fail fast, including
references to unset variables.

## Local development

Local dev runs inside the nix devShell: `nix develop` (or `nix develop -c
<cmd>` for one-offs). The shell provides Node 24 and Playwright browsers from
nixpkgs via `PLAYWRIGHT_BROWSERS_PATH` — never run `npx playwright install`.
Constraint: the `playwright` version in `package.json` must stay pinned to
the exact version of nixpkgs' `playwright-driver` (echoed in the shell as
`$PLAYWRIGHT_DRIVER_VERSION`); when bumping the flake's nixpkgs input,
re-pin `playwright` to match and regenerate the lockfile.

Biome also comes from the devShell, not npm — the npm-shipped binary is
dynamically linked and cannot run on NixOS. Keep `biome.json`'s `$schema`
version in sync with nixpkgs' biome when bumping the flake input.

## Commands

- `npm run start:dev` (also plain `npm start`) — build, then run once locally
  with `.env` loaded if present. Set `HEADFUL=1` to watch the browser.
- `npm run build` — `tsc` to `dist/`.
- `npm run start:prod` — run the built `dist/main.js` (what the container runs).
- `npm run lint` / `npm run lint:fix` — Biome check / auto-fix.
- `npm run test` — build, then run the `node:test` suites (`src/*.test.ts`).
- `npm run fixtures:record` — re-record `fixtures/darmstadt-flow.har` from
  the live site (do this in the same PR as any selector fix).

**The canonical verification command is `npm run verify`** (lint + kustomize
render of `deploy/` + build + tests). The booking flow is regression-tested
against a recorded HAR of the site — a failure there means our code broke,
while live-site drift shows up via production's healthchecks alarm, not
tests. After changing `src/darmstadt.ts`, still do one live
`npm run start:dev` run, then re-record the fixture.

## Release

Cutting a release: bump `version` in `package.json` (sync the lockfile with
`npm install --package-lock-only`) and the image tag in `deploy/cronjob.yaml`
in the release-prep commit, then tag. Tag a commit `vX.Y.Z` and push the tag;
CI builds and publishes the Docker image to GHCR. Pushes to main and PRs run `npm run verify` in CI through the
flake devShell — the same toolchain as local dev, including the Playwright
browsers for the HAR-replay test (the nix store is cached across runs). The
publish workflow itself does not run verify, so don't tag an unverified
commit.

## Task tracking

This project keeps a **long-living `TASKS.md`** — a persistent improvement
backlog that survives across branches. Do not create or delete it per branch;
append to it and move items between its sections as work progresses.

