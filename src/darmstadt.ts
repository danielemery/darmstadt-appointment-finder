import type { Page } from "playwright";
import type { WatchedAppointment } from "./config.js";

/**
 * Drives the tevis booking flow for the given appointment and reports
 * whether a slot is available.
 *
 * Flow (as of 2026-07): accept cookies → pick office → expand service
 * category → increment the concern counter → Weiter → confirm dialog →
 * location selection → Weiter → appointment suggestions.
 */
export async function checkAppointmentAvailable(
  page: Page,
  appointment: Pick<WatchedAppointment, "office" | "category" | "concern">
): Promise<boolean> {
  const cookieLocation = page.getByRole("button", { name: "Akzeptieren" });
  await cookieLocation.waitFor();
  await cookieLocation.click();

  const buttonLocation = page.getByText(appointment.office);
  await buttonLocation.waitFor();
  await buttonLocation.click();

  const dropDownLocation = page.getByText(appointment.category);
  await dropDownLocation.waitFor();
  await dropDownLocation.click();

  const plusButtonLocation = page.locator(
    `button[aria-label='Erhöhen der Anzahl des Anliegens ${appointment.concern}']`
  );
  await plusButtonLocation.waitFor();
  await plusButtonLocation.click();

  // "Weiter" needs an exact match: the concern counters substring-match it
  // via "Erweiterung" in their aria-labels.
  const nextButtonLocation = page.getByRole("button", {
    name: "Weiter",
    exact: true,
  });
  await nextButtonLocation.waitFor();
  await nextButtonLocation.click();

  const okButtonLocation = page.locator("button[id='OKButton']");
  await okButtonLocation.waitFor();
  await okButtonLocation.click();

  // Location selection: a single location that the Weiter submit accepts
  // without an explicit choice.
  const locationNextButtonLocation = page.getByRole("button", {
    name: "Weiter",
    exact: true,
  });
  await locationNextButtonLocation.waitFor();
  await locationNextButtonLocation.click();

  const noAppointmentText = page.getByText("Kein freier Termin verfügbar");
  try {
    await noAppointmentText.waitFor({ timeout: 5000 });
    return false;
  } catch (err) {
    return true;
  }
}
