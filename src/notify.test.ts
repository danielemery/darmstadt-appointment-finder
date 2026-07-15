import assert from "node:assert/strict";
import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import { after, test } from "node:test";
import { sendNotification } from "./notify.js";

let lastRequest: { path: string; body: string } | undefined;
let respondWithStatus = 200;

const server = createServer((req: IncomingMessage, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });
  req.on("end", () => {
    lastRequest = { path: req.url ?? "", body };
    res.statusCode = respondWithStatus;
    res.end(respondWithStatus === 200 ? "{}" : '{"error": "boom"}');
  });
});

await new Promise<void>((resolve) => server.listen(0, resolve));
const appriseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

after(() => server.close());

test("posts title, body, and joined urls to /notify", async () => {
  respondWithStatus = 200;
  await sendNotification(appriseUrl, ["gotify://host/token", "ntfy://topic"], {
    title: "the title",
    body: "the body",
  });

  assert.ok(lastRequest);
  assert.equal(lastRequest.path, "/notify");
  assert.deepEqual(JSON.parse(lastRequest.body), {
    urls: "gotify://host/token,ntfy://topic",
    title: "the title",
    body: "the body",
  });
});

test("throws on a non-2xx response, including status and body", async () => {
  respondWithStatus = 424;
  await assert.rejects(
    sendNotification(appriseUrl, ["gotify://host/token"], {
      title: "t",
      body: "b",
    }),
    /Apprise notify failed: 424.*boom/,
  );
});
