import { chromium } from "playwright";
import { loadConfig, requireEnv } from "./config.js";
import { checkAppointmentAvailable } from "./darmstadt.js";
import { sendNotification } from "./notify.js";

const START_URL = "https://tevis.ekom21.de/stdar";

const APPRISE_URL = requireEnv("APPRISE_URL");
const HEALTHCHECKS_IO_SLUG = requireEnv("HEALTHCHECKS_IO_SLUG");
const config = await loadConfig(process.env.CONFIG_PATH ?? "config.json");

// Set HEADFUL=1 to watch the browser during local development.
const browser = await chromium.launch({ headless: !process.env.HEADFUL });

// A failed booking-flow check aborts the run without a heartbeat (the
// healthchecks.io alarm is the breakage signal); a failed notification still
// heartbeats but fails the run.
const notifyErrors: string[] = [];

try {
  for (const appointment of config.appointments) {
    // A fresh context per appointment so each check starts the booking flow
    // from a clean session.
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(START_URL);

    const available = await checkAppointmentAvailable(page, appointment);

    if (available) {
      console.log(`Appointment available: ${appointment.name}`);
      try {
        await sendNotification(APPRISE_URL, appointment.notifyUrls, {
          title: `Appointment available: ${appointment.name}`,
          body: `An appointment for "${appointment.name}" is available. Book now: ${START_URL}`,
        });
      } catch (err) {
        console.error(err);
        notifyErrors.push(appointment.name);
      }
    } else {
      console.log(`No appointment available: ${appointment.name}`);
    }

    await context.close();
  }

  await fetch(`https://hc-ping.com/${HEALTHCHECKS_IO_SLUG}`);
} finally {
  await browser.close();
}

if (notifyErrors.length > 0) {
  console.error(`Failed to send notifications for: ${notifyErrors.join(", ")}`);
  process.exitCode = 1;
}
