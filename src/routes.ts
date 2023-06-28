import { Dataset, createPlaywrightRouter } from "crawlee";

export const router = createPlaywrightRouter();

const GOTIFY_TOKEN = process.env.GOTIFY_TOKEN;
const GOTIFY_URL = process.env.GOTIFY_URL;
const HEALTHCHECKS_IO_SLUG = process.env.HEALTHCHECKS_IO_SLUG;

router.addDefaultHandler(async ({ page, log }) => {
  const cookieLocation = page.locator(
    'input[aria-label="Cookie-Verwendung akzeptieren"]'
  );
  await cookieLocation.waitFor();
  await cookieLocation.click();

  const buttonLocation = page.getByText("Fahrerlaubnisbehörde");
  await buttonLocation.waitFor();
  await buttonLocation.click();

  const dropDownLocation = page.getByText("Erteilung/Ersatz/Umtausch");
  await dropDownLocation.waitFor();
  await dropDownLocation.click();

  const plusButtonLocation = page.locator(
    "button[aria-label='Erhöhen der Anzahl des Anliegens Antrag Umschreibung einer ausländischen Fahrerlaubnis']"
  );
  await plusButtonLocation.waitFor();
  await plusButtonLocation.click();

  const nextButtonLocation = page.locator("input[aria-label='Weiter']");
  await nextButtonLocation.waitFor();
  await nextButtonLocation.click();

  const okButtonLocation = page.locator("button[id='OKButton']");
  await okButtonLocation.waitFor();
  await okButtonLocation.click();

  const noAppointmentText = page.getByText("Kein freier Termin verfügbar");
  try {
    await noAppointmentText.waitFor({ timeout: 5000 });
    log.info("No appointment available");
  } catch (err) {
    log.info("Appointment available");
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
  } finally {
    await fetch(`https://hc-ping.com/${HEALTHCHECKS_IO_SLUG}`);
  }
});

router.addHandler("detail", async ({ request, page, log }) => {
  const title = await page.title();
  log.info(`${title}`, { url: request.loadedUrl });

  await Dataset.pushData({
    url: request.loadedUrl,
    title,
  });
});
