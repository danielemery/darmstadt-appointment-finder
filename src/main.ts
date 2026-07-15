import { chromium } from "playwright";
import { checkAppointmentAvailable } from "./darmstadt.js";
import { sendNotification } from "./notify.js";

const START_URL = "https://tevis.ekom21.de/stdar";

const APPRISE_URL = process.env.APPRISE_URL;
const APPRISE_NOTIFY_URLS = process.env.APPRISE_NOTIFY_URLS;
const HEALTHCHECKS_IO_SLUG = process.env.HEALTHCHECKS_IO_SLUG;

// Set HEADFUL=1 to watch the browser during local development.
const browser = await chromium.launch({ headless: !process.env.HEADFUL });

try {
  const page = await browser.newPage();
  await page.goto(START_URL);

  const available = await checkAppointmentAvailable(page);

  try {
    if (available) {
      console.log("Appointment available");
      await sendNotification(APPRISE_URL, APPRISE_NOTIFY_URLS, {
        title: "Appointment available",
        body: `A drivers license appointment is available. Book now: ${START_URL}`,
      });
    } else {
      console.log("No appointment available");
    }
  } finally {
    await fetch(`https://hc-ping.com/${HEALTHCHECKS_IO_SLUG}`);
  }
} finally {
  await browser.close();
}
