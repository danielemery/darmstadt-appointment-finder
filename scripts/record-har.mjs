// Records the live booking flow into fixtures/*.har for the replay tests in
// src/darmstadt.test.ts. One fixture per known flow shape. Re-run
// (npm run fixtures:record) whenever the site changes — in the same PR as
// the selector fix.
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { checkAppointmentAvailable } from "../dist/darmstadt.js";

const START_URL = "https://tevis.ekom21.de/stdar";

const fixtures = [
  {
    // This concern shows a confirmation dialog (OKButton) after Weiter.
    key: "confirmation-dialog",
    appointment: {
      office: "Fahrerlaubnisbehörde",
      category: "Erteilung/Ersatz/Umtausch",
      concern: "Antrag Umschreibung einer ausländischen Fahrerlaubnis",
    },
  },
  {
    // This concern navigates straight to the location step.
    key: "no-dialog",
    appointment: {
      office: "Fahrerlaubnisbehörde",
      category: "Erteilung/Ersatz/Umtausch",
      concern:
        "Antrag Ersatzführerschein (nach Namensänderung/Austrag Sehhilfe)",
    },
  },
];

const browser = await chromium.launch();
for (const { key, appointment } of fixtures) {
  const harPath = `fixtures/darmstadt-flow-${key}.har`;
  const context = await browser.newContext({
    recordHar: { path: harPath, content: "embed" },
  });
  const page = await context.newPage();
  await page.goto(START_URL);
  const available = await checkAppointmentAvailable(page, appointment);
  await context.close();

  await writeFile(
    `fixtures/darmstadt-flow-${key}.json`,
    `${JSON.stringify({ recordedAt: new Date().toISOString(), key, available, appointment }, null, 2)}\n`,
  );
  console.log(`Recorded ${harPath} (available at record time: ${available})`);
}
await browser.close();
