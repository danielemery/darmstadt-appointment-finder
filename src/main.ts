import { chromium } from "playwright";
import { checkAppointmentAvailable } from "./darmstadt.js";

const START_URL = "https://tevis.ekom21.de/stdar";

const GOTIFY_TOKEN = process.env.GOTIFY_TOKEN;
const GOTIFY_URL = process.env.GOTIFY_URL;
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
      await fetch(`${GOTIFY_URL}/message?token=${GOTIFY_TOKEN}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Appointment available",
          message: "A drivers license appointment is available",
        }),
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
