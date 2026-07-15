import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { chromium } from "playwright";
import { checkAppointmentAvailable } from "./darmstadt.js";

const fixturesDir = path.join(import.meta.dirname, "..", "fixtures");

/**
 * Replays the booking flow against recorded copies of the site (one HAR per
 * known flow shape, re-recorded via `npm run fixtures:record`). A failure
 * here means our code no longer handles the recorded site shape — live site
 * drift is signalled by production's healthchecks alarm instead.
 */
const metaFiles = (await readdir(fixturesDir)).filter((f) =>
  f.endsWith(".json"),
);
assert.ok(metaFiles.length > 0, "no fixture metadata found");

for (const metaFile of metaFiles) {
  const meta = JSON.parse(
    await readFile(path.join(fixturesDir, metaFile), "utf8"),
  );

  test(`booking flow completes against the recorded site (${meta.key})`, async () => {
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext();
      await context.routeFromHAR(
        path.join(fixturesDir, `darmstadt-flow-${meta.key}.har`),
        { notFound: "abort" },
      );
      const page = await context.newPage();
      // Fail fast on selector regressions instead of the 30s default.
      page.setDefaultTimeout(10_000);

      await page.goto("https://tevis.ekom21.de/stdar");
      const available = await checkAppointmentAvailable(page, meta.appointment);

      assert.equal(available, meta.available);
    } finally {
      await browser.close();
    }
  });
}
