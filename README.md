# Darmstadt Appointment Finder

Docker container to run on a CRON to check the Darmstadt public office for appointments.

A Playwright + TypeScript project.

## Notes

- Currently only finds international driver's license appointments for Darmstadt but could be modified to look for others.
- Uses healthchecks.io to send a heartbeat every time it runs.
- Sends notifications through an [Apprise API](https://github.com/caronc/apprise-api) server when an appointment is found. Delivery priority is set per target in the Apprise URL (e.g. `gotify://host/token?priority=high`).

## Configuration

All configuration is provided by environment variables.

| Name                 | Description                                                                       | Example                              |
|----------------------|-----------------------------------------------------------------------------------|--------------------------------------|
| APPRISE_URL          | Url of the Apprise API server used to send notifications                          | https://apprise.domain.net           |
| APPRISE_NOTIFY_URLS  | Comma-separated Apprise URLs to notify when an appointment is found               | gotify://gotify.domain.net/token     |
| HEALTHCHECKS_IO_SLUG | Slug from healthchecks.io, a heartbeat request is sent on completion of each run  | e2654249-76b7-42d0-a292-3d5e993a4243 |
| HEADFUL              | Optional. Set to any value to run the browser headful during local development    | 1                                    |

## Local testing

`docker compose up -d` starts a local Apprise API server plus an HTTP echo
sink. Point the app at them to observe a delivered notification:

```
APPRISE_URL=http://localhost:8000 APPRISE_NOTIFY_URLS=json://echo:8080 npm run start:dev
docker compose logs echo
```
