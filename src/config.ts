import { readFile } from "node:fs/promises";

export interface WatchedAppointment {
  /** Human-readable name, used in logs and notification messages. */
  name: string;
  /** Office button text on step 1, e.g. "Fahrerlaubnisbehörde". */
  office: string;
  /** Accordion header text on step 2, e.g. "Erteilung/Ersatz/Umtausch". */
  category: string;
  /**
   * Concern name exactly as it appears in the increment button's aria-label,
   * e.g. "Antrag Umschreibung einer ausländischen Fahrerlaubnis".
   */
  concern: string;
  /** Apprise URLs to notify when a slot appears. */
  notifyUrls: string[];
}

export interface Config {
  appointments: WatchedAppointment[];
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

/**
 * Substitutes ${VAR} references from the environment, so secrets (e.g.
 * tokens inside Apprise URLs) can stay out of the committed config and be
 * injected into the container instead. Unset variables are a hard error.
 */
function interpolate(value: string, location: string): string {
  return value.replace(/\$\{([A-Za-z0-9_]+)\}/g, (_, name: string) => {
    const env = process.env[name];
    if (env === undefined) {
      throw new Error(
        `${location} references environment variable ${name}, which is not set`,
      );
    }
    return env;
  });
}

function requireString(
  value: unknown,
  location: string,
  interpolated = false,
): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${location} must be a non-empty string`);
  }
  return interpolated ? interpolate(value, location) : value;
}

export async function loadConfig(configPath: string): Promise<Config> {
  let raw: string;
  try {
    raw = await readFile(configPath, "utf8");
  } catch (err) {
    throw new Error(
      `Could not read config file at ${configPath}: ${(err as Error).message}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Config file at ${configPath} is not valid JSON: ${(err as Error).message}`,
    );
  }

  const appointments = (parsed as { appointments?: unknown }).appointments;
  if (!Array.isArray(appointments) || appointments.length === 0) {
    throw new Error("Config must contain a non-empty appointments array");
  }

  return {
    appointments: appointments.map((entry: unknown, i: number) => {
      const at = `appointments[${i}]`;
      const record = entry as Record<string, unknown>;
      const notifyUrls = record.notifyUrls;
      if (!Array.isArray(notifyUrls) || notifyUrls.length === 0) {
        throw new Error(`${at}.notifyUrls must be a non-empty array`);
      }
      return {
        name: requireString(record.name, `${at}.name`),
        office: requireString(record.office, `${at}.office`),
        category: requireString(record.category, `${at}.category`),
        concern: requireString(record.concern, `${at}.concern`),
        notifyUrls: notifyUrls.map((url, j) =>
          requireString(url, `${at}.notifyUrls[${j}]`, true),
        ),
      };
    }),
  };
}
