# Darmstadt Appointment Finder

Docker container to run on a CRON to check the Darmstadt public office for appointments.

A Playwright + TypeScript project.

## Notes

- Watches any number of Darmstadt appointment types, declared in a config file.
- Signals every run to healthchecks.io: a heartbeat on success, the `/fail` endpoint (with error details) when any check or notification failed.
- Sends notifications through an [Apprise API](https://github.com/caronc/apprise-api) server when an appointment is found. Delivery priority is set per target in the Apprise URL (e.g. `gotify://host/token?priority=high`).

## Configuration

### Config file

The watched appointments are declared in a JSON config file, read at startup
from `CONFIG_PATH` (see `config.example.json`):

```json
{
  "appointments": [
    {
      "name": "International driver's license exchange",
      "office": "Fahrerlaubnisbehörde",
      "category": "Erteilung/Ersatz/Umtausch",
      "concern": "Antrag Umschreibung einer ausländischen Fahrerlaubnis",
      "notifyUrls": [
        "gotify://gotify.domain.net/${GOTIFY_APP_TOKEN}?priority=high"
      ]
    }
  ]
}
```

- `office`, `category`, and `concern` must match the booking site's German
  labels exactly (office button, accordion header, and the concern's name in
  its increment button).
- `notifyUrls` are Apprise URLs, notified when a slot appears for that entry.
- String values may reference environment variables as `${VAR}`, so secrets
  (e.g. tokens inside Apprise URLs) stay out of committed config and are
  passed to the container instead — for example from SOPS. Referencing an
  unset variable fails the run at startup.

In the container, mount the config at `/app/config.json` (the default
`CONFIG_PATH`).

### Environment variables

| Name                 | Description                                                                       | Example                              |
|----------------------|-----------------------------------------------------------------------------------|--------------------------------------|
| APPRISE_URL          | Url of the Apprise API server used to send notifications                          | https://apprise.domain.net           |
| HEALTHCHECKS_IO_SLUG | Slug from healthchecks.io, a heartbeat request is sent on completion of each run  | e2654249-76b7-42d0-a292-3d5e993a4243 |
| CONFIG_PATH          | Optional. Path to the config file, defaults to `./config.json`                    | /app/config.json                     |
| HEADFUL              | Optional. Set to any value to run the browser headful during local development    | 1                                    |

Plus any variables referenced as `${VAR}` in the config file.

## Local testing

`docker compose up -d` starts a local Apprise API server plus an HTTP echo
sink. Point a config's `notifyUrls` at the sink (`json://echo:8080`) to
observe a delivered notification:

```
CONFIG_PATH=my-config.json APPRISE_URL=http://localhost:8000 HEALTHCHECKS_IO_SLUG=x npm run start:dev
docker compose logs echo
```
