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
   expand service category → increment the request counter → continue → OK).
2. Looks for the text "Kein freier Termin verfügbar". If absent, an
   appointment is assumed available and a **Gotify** notification is sent.
3. Always pings **healthchecks.io** (`https://hc-ping.com/<slug>`) as a
   heartbeat, whether or not an appointment was found.

## State of the repo (as of 2026-07)

- Dormant 2023–2026, now being modernised; see `TASKS.md` for the backlog.
- **The scraper is selector-driven against a third-party site.** The German
  text selectors and aria-labels in `src/darmstadt.ts` are the fragile
  surface. **Known broken as of 2026-07-15:** the site's cookie banner
  changed since 2023 (now `Akzeptieren`/`Ablehnen` inputs without
  aria-labels), so the flow fails at step one; later steps are unverified.
- The failure mode is inverted-alarm: any breakage in the booking flow throws
  before the notify/heartbeat code, so the run neither notifies falsely nor
  pings healthchecks — healthchecks.io going quiet is the intended breakage
  signal.
- Local dev is modernised (Node 24, playwright 1.61.1 via the nix flake),
  but the Docker image still builds on the Node 18 base (EOL April 2025)
  whose preinstalled browsers no longer match the pinned playwright —
  treat the container as broken until the runtime upgrade in `TASKS.md`
  lands. TypeScript (5.1.5) and `@apify/tsconfig` are 2023 leftovers.

## Layout

| Path | Purpose |
|---|---|
| `src/main.ts` | Entry point: launches Chromium, runs the check, notifies Gotify on success, pings healthchecks.io. |
| `src/darmstadt.ts` | Drives the tevis booking flow and returns whether an appointment is available. |
| `Dockerfile` | Two-stage build on `apify/actor-node-playwright-chrome:18`; runs `npm run start:prod` under xvfb. |
| `.github/workflows/publish.yml` | On pushing a `v*.*.*` tag, builds and pushes the image to GHCR (`ghcr.io/<repo>`). |
| `.env.example` | Template for the three required env vars. |

## Configuration

All config is via environment variables (loaded from `.env` via node's
`--env-file-if-exists` in dev mode only; in the container they must be
provided by the runtime):

- `GOTIFY_URL` — base URL of the Gotify instance.
- `GOTIFY_TOKEN` — Gotify app token.
- `HEALTHCHECKS_IO_SLUG` — healthchecks.io check slug for the heartbeat ping.

None are validated at startup; missing values only surface when the fetch
calls fire.

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

