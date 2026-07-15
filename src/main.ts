import { chromium } from "playwright";
import { loadConfig, requireEnv } from "./config.js";
import { checkAppointmentAvailable } from "./darmstadt.js";
import { sendNotification } from "./notify.js";

const START_URL = "https://tevis.ekom21.de/stdar";

const APPRISE_URL = requireEnv("APPRISE_URL");
const HEALTHCHECKS_IO_SLUG = requireEnv("HEALTHCHECKS_IO_SLUG");
const config = await loadConfig(process.env.CONFIG_PATH ?? "config.json");

/**
 * Signals the run's outcome to healthchecks.io: a plain ping on success, the
 * /fail endpoint on failure so breakage alarms immediately instead of via a
 * missed heartbeat. The message shows up in the check's event log.
 */
async function heartbeat(ok: boolean, message: string): Promise<void> {
  await fetch(
    `https://hc-ping.com/${HEALTHCHECKS_IO_SLUG}${ok ? "" : "/fail"}`,
    {
      method: "POST",
      body: message,
    },
  );
}

// Entries are checked independently: a broken flow for one appointment must
// not hide availability of the others. Any failure still fails the run.
const failures: string[] = [];

// Set HEADFUL=1 to watch the browser during local development.
const browser = await chromium.launch({ headless: !process.env.HEADFUL });

try {
  for (const appointment of config.appointments) {
    try {
      // A fresh context per appointment so each check starts the booking
      // flow from a clean session.
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(START_URL);

      const available = await checkAppointmentAvailable(page, appointment);

      if (available) {
        console.log(`Appointment available: ${appointment.name}`);
        await sendNotification(APPRISE_URL, appointment.notifyUrls, {
          title: `Appointment available: ${appointment.name}`,
          body: `An appointment for "${appointment.name}" is available. Book now: ${START_URL}`,
        });
      } else {
        console.log(`No appointment available: ${appointment.name}`);
      }

      await context.close();
    } catch (err) {
      console.error(`Check failed for "${appointment.name}":`, err);
      failures.push(`${appointment.name}: ${(err as Error).message}`);
    }
  }
} finally {
  await browser.close();
}

if (failures.length > 0) {
  await heartbeat(false, failures.join("\n"));
  process.exitCode = 1;
} else {
  await heartbeat(true, `Checked ${config.appointments.length} appointment(s)`);
}
