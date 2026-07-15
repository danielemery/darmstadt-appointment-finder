import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { loadConfig, requireEnv } from "./config.js";

const dir = await mkdtemp(path.join(tmpdir(), "config-test-"));

async function writeConfig(name: string, content: unknown): Promise<string> {
  const file = path.join(dir, name);
  await writeFile(
    file,
    typeof content === "string" ? content : JSON.stringify(content),
  );
  return file;
}

const validEntry = {
  name: "Test appointment",
  office: "Fahrerlaubnisbehörde",
  category: "Erteilung/Ersatz/Umtausch",
  concern: "Antrag Umschreibung einer ausländischen Fahrerlaubnis",
  notifyUrls: ["gotify://host/token"],
};

test("loads a valid config", async () => {
  const file = await writeConfig("valid.json", {
    appointments: [validEntry],
  });
  const config = await loadConfig(file);
  assert.equal(config.appointments.length, 1);
  assert.deepEqual(config.appointments[0], validEntry);
});

test("interpolates env var references in notifyUrls", async () => {
  process.env.CONFIG_TEST_TOKEN = "sekrit";
  const file = await writeConfig("interpolate.json", {
    appointments: [
      {
        ...validEntry,
        // biome-ignore lint/suspicious/noTemplateCurlyInString: the literal ${VAR} syntax is what's under test
        notifyUrls: ["gotify://host/${CONFIG_TEST_TOKEN}?priority=high"],
      },
    ],
  });
  const config = await loadConfig(file);
  assert.equal(
    config.appointments[0]?.notifyUrls[0],
    "gotify://host/sekrit?priority=high",
  );
});

test("rejects a reference to an unset variable", async () => {
  const file = await writeConfig("unset-var.json", {
    appointments: [
      {
        ...validEntry,
        // biome-ignore lint/suspicious/noTemplateCurlyInString: the literal ${VAR} syntax is what's under test
        notifyUrls: ["gotify://host/${CONFIG_TEST_UNSET_VAR}"],
      },
    ],
  });
  await assert.rejects(loadConfig(file), /CONFIG_TEST_UNSET_VAR.*not set/);
});

test("rejects a missing config file", async () => {
  await assert.rejects(
    loadConfig(path.join(dir, "missing.json")),
    /Could not read config file/,
  );
});

test("rejects invalid JSON", async () => {
  const file = await writeConfig("invalid.json", "{not json");
  await assert.rejects(loadConfig(file), /not valid JSON/);
});

test("rejects an empty appointments array", async () => {
  const file = await writeConfig("empty.json", { appointments: [] });
  await assert.rejects(loadConfig(file), /non-empty appointments array/);
});

test("rejects a missing field, naming its location", async () => {
  const { concern, ...withoutConcern } = validEntry;
  const file = await writeConfig("no-concern.json", {
    appointments: [withoutConcern],
  });
  await assert.rejects(loadConfig(file), /appointments\[0\]\.concern/);
});

test("rejects empty notifyUrls", async () => {
  const file = await writeConfig("no-urls.json", {
    appointments: [{ ...validEntry, notifyUrls: [] }],
  });
  await assert.rejects(
    loadConfig(file),
    /notifyUrls must be a non-empty array/,
  );
});

test("requireEnv returns a set variable and rejects an unset one", () => {
  process.env.CONFIG_TEST_SET = "value";
  assert.equal(requireEnv("CONFIG_TEST_SET"), "value");
  assert.throws(
    () => requireEnv("CONFIG_TEST_DEFINITELY_UNSET"),
    /CONFIG_TEST_DEFINITELY_UNSET is not set/,
  );
});
