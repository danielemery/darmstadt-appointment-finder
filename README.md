# Darmstadt Appointment Finder

Docker container to run on a CRON to check the Darmstadt public office for appointments.

Bootstrapped as a Crawlee + PlaywrightCrawler + TypeScript project.

## Notes

- Currently only finds international driver's license appointments for Darmstadt but could be modified to look for others.
- Uses healthchecks.io to send a heartbeat every time it runs.
- Uses gotify to send a notification when an appointment is found.

## Configuration

All configuration is provided by environment variables.

| Name                 | Description                                                                      | Example                              |
|----------------------|----------------------------------------------------------------------------------|--------------------------------------|
| GOTIFY_URL           | Url of the Gotify instance to be used when notifying of a completed appointment  | https://gotify.domain.net            |
| GOTIFY_TOKEN         | Gotify app token used to authenticate when sending a notification                | skl4kmsdvl34                         |
| HEALTHCHECKS_IO_SLUG | Slug from healthchecks.io, a heartbeat request is sent on completion of each run | e2654249-76b7-42d0-a292-3d5e993a4243 |
