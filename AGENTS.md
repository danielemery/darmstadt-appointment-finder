# AGENTS.md

Project context for agents working in this repo. Process rules live in the
operator's global `AGENTS.md`; this file is project facts only.

## What this is

A single-purpose web scraper that checks the Darmstadt public office booking
site (`https://tevis.ekom21.de/stdar`) for **international driver's license
exchange appointments** ("Umschreibung einer ausländischen Fahrerlaubnis" at
the Fahrerlaubnisbehörde). It is packaged as a Docker image intended to be run
periodically by an external cron — the app itself performs one check and exits.

On each run it:

1. Drives the booking flow with Playwright (accept cookies → pick office →
   expand service category → increment the concern counter → continue →
   confirm dialog → location selection → continue).
2. Looks for the text "Kein freier Termin verfügbar". If absent, an
   appointment is assumed available and a notification is sent through an
   **Apprise API** server (delivery priority is encoded per target in the
   Apprise URL, not in code).
3. Always pings **healthchecks.io** (`https://hc-ping.com/<slug>`) as a
   heartbeat, whether or not an appointment was found.

## State of the repo (as of 2026-07)

- Dormant 2023–2026, modernised and working again as of 2026-07-15; see
  `TASKS.md` for the remaining backlog.
- **The scraper is selector-driven against a third-party site.** The German
  text selectors and aria-labels in `src/darmstadt.ts` are the fragile
  surface; the site drifted once already (2023→2026: new cookie banner, new
  location-selection step, "Weiter" lost its aria-label). Verify against the
  live site after any change to the flow.
- The failure mode is inverted-alarm: any breakage in the booking flow throws
  before the notify/heartbeat code, so the run neither notifies falsely nor
  pings healthchecks — healthchecks.io going quiet is the intended breakage
  signal.
- The toolchain is fully modernised (Node 24 + playwright 1.61.1 locally via
  the nix flake; `mcr.microsoft.com/playwright:v1.61.1` in the container).
  Constraint: the Docker base image tag, the `playwright` version in
  `package.json`, and nixpkgs' `playwright-driver` must all stay on the same
  version.

## Layout

| Path | Purpose |
|---|---|
| `src/main.ts` | Entry point: launches Chromium, runs the check, notifies Gotify on success, pings healthchecks.io. |
| `src/darmstadt.ts` | Drives the tevis booking flow and returns whether an appointment is available. |
| `src/notify.ts` | Sends notifications through an Apprise API server's stateless notify endpoint. |
| `compose.yaml` | Dev-only: local Apprise server + HTTP echo sink for observing notifications. |
| `Dockerfile` | Two-stage build on `mcr.microsoft.com/playwright:v1.61.1-noble`; final stage holds prod deps + `dist/` only. |
| `.github/workflows/publish.yml` | On pushing a `v*.*.*` tag, builds and pushes the image to GHCR (`ghcr.io/<repo>`). |
| `.env.example` | Template for the three required env vars. |

## Configuration

All config is via environment variables (loaded from `.env` via node's
`--env-file-if-exists` in dev mode only; in the container they must be
provided by the runtime):

- `APPRISE_URL` — base URL of the Apprise API server.
- `APPRISE_NOTIFY_URLS` — comma-separated Apprise URLs to notify (interim:
  moves into the config file when that lands).
- `HEALTHCHECKS_IO_SLUG` — healthchecks.io check slug for the heartbeat ping.

The Apprise vars are checked when a notification is sent; the healthchecks
slug is still unvalidated (a missing value only surfaces as a failed fetch).

## Local development

Local dev runs inside the nix devShell: `nix develop` (or `nix develop -c
<cmd>` for one-offs). The shell provides Node 24 and Playwright browsers from
nixpkgs via `PLAYWRIGHT_BROWSERS_PATH` — never run `npx playwright install`.
Constraint: the `playwright` version in `package.json` must stay pinned to
the exact version of nixpkgs' `playwright-driver` (echoed in the shell as
`$PLAYWRIGHT_DRIVER_VERSION`); when bumping the flake's nixpkgs input,
re-pin `playwright` to match and regenerate the lockfile.

## Commands

- `npm run start:dev` (also plain `npm start`) — build, then run once locally
  with `.env` loaded if present. Set `HEADFUL=1` to watch the browser.
- `npm run build` — `tsc` to `dist/`.
- `npm run start:prod` — run the built `dist/main.js` (what the container runs).

There are no tests and no linter. **The canonical verification command is
`npm run build`** (typecheck); real verification of behaviour means running
`npm run start:dev` against the live site and reading the log output
("No appointment available" / "Appointment available").

## Release

Tag a commit `vX.Y.Z` and push the tag; CI builds and publishes the Docker
image to GHCR. There is no CI on ordinary pushes or PRs — nothing runs build
or typecheck before the tag, so verify locally before tagging.

## Task tracking

This project keeps a **long-living `TASKS.md`** — a persistent improvement
backlog that survives across branches. Do not create or delete it per branch;
append to it and move items between its sections as work progresses.

