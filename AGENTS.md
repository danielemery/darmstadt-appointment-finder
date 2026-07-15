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

- One commit, from June 2023. Nothing has been touched since; treat everything
  below as potentially stale until verified against the live site.
- **The scraper is selector-driven against a third-party site.** The tevis
  booking UI may have changed since 2023 — German-language text selectors and
  aria-labels in `src/routes.ts` are the fragile surface. Verify against the
  real site before trusting a green run.
- The failure mode is inverted-alarm: any breakage in the happy path before
  the "Kein freier Termin" check throws inside the handler, so the run neither
  notifies falsely nor pings healthchecks — healthchecks.io going quiet is the
  intended breakage signal.
- Dependencies are old: Node 18 base image (EOL since April 2025),
  `@types/node` 18, `playwright` pinned to `*` (whatever the base image
  ships), Crawlee 3.x. Expect friction on a fresh `npm install`.

## Layout

| Path | Purpose |
|---|---|
| `src/main.ts` | Entry point: creates a `PlaywrightCrawler` with the router and runs it against the start URL. |
| `src/routes.ts` | All real logic: the default handler drives the booking flow and does the notify/heartbeat. The `detail` handler is unused Crawlee-template boilerplate. |
| `Dockerfile` | Two-stage build on `apify/actor-node-playwright-chrome:18`; runs `npm run start:prod` under xvfb. |
| `.github/workflows/publish.yml` | On pushing a `v*.*.*` tag, builds and pushes the image to GHCR (`ghcr.io/<repo>`). |
| `.env.example` | Template for the three required env vars. |

## Configuration

All config is via environment variables (loaded from `.env` by dotenv in dev
mode only; in the container they must be provided by the runtime):

- `GOTIFY_URL` — base URL of the Gotify instance.
- `GOTIFY_TOKEN` — Gotify app token.
- `HEALTHCHECKS_IO_SLUG` — healthchecks.io check slug for the heartbeat ping.

None are validated at startup; missing values only surface when the fetch
calls fire.

## Commands

- `npm run start:dev` (also plain `npm start`) — run once locally via
  `ts-node-esm` with `.env` loaded. Uncomment `headless: false` in
  `src/main.ts` to watch the browser.
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

## Local artefacts

Crawlee writes run state to `storage/` (gitignored) — request queues persist
between runs, so delete `storage/` if a local run appears to do nothing
because the start URL is already marked handled.
