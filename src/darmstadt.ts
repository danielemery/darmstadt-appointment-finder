import type { Page } from "playwright";

/**
 * Drives the tevis booking flow for an international driver's license
 * exchange appointment ("Umschreibung einer ausländischen Fahrerlaubnis")
 * and reports whether a slot is available.
 */
export async function checkAppointmentAvailable(page: Page): Promise<boolean> {
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
    return false;
  } catch (err) {
    return true;
  }
}
