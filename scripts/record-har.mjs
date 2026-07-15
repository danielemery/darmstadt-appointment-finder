// Records the live booking flow into fixtures/darmstadt-flow.har for the
// replay test in src/darmstadt.test.ts. Re-run (npm run fixtures:record)
// whenever the site changes — in the same PR as the selector fix.
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { checkAppointmentAvailable } from "../dist/darmstadt.js";

const START_URL = "https://tevis.ekom21.de/stdar";
const HAR_PATH = "fixtures/darmstadt-flow.har";
const META_PATH = "fixtures/darmstadt-flow.json";

const appointment = {
  office: "Fahrerlaubnisbehörde",
  category: "Erteilung/Ersatz/Umtausch",
  concern: "Antrag Umschreibung einer ausländischen Fahrerlaubnis",
};

const browser = await chromium.launch();
const context = await browser.newContext({
  recordHar: { path: HAR_PATH, content: "embed" },
});
const page = await context.newPage();
await page.goto(START_URL);
const available = await checkAppointmentAvailable(page, appointment);
await context.close();
await browser.close();

await writeFile(
  META_PATH,
  `${JSON.stringify({ recordedAt: new Date().toISOString(), available, appointment }, null, 2)}\n`,
);
console.log(`Recorded ${HAR_PATH} (available at record time: ${available})`);
