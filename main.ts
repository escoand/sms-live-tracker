import { Hono } from "npm:hono";
import { serveStatic } from "npm:hono/deno";
import { etag } from "npm:hono/etag";
import { HTTPException } from "npm:hono/http-exception";
import { logger } from "npm:hono/logger";
import { SmsGateApp } from "./src/backend/smsgateapp/smsgateapp.ts";
import { TrackerStore } from "./src/store.ts";

const dataDir = "data";
const staticDir = "www";
const trackersFile = dataDir + "/trackers.json";

const store = new TrackerStore(trackersFile);
const backend = new SmsGateApp(store);
const app = new Hono();

app.use(logger());

app.post("/api/request", async (c) => {
  return await c.req
    .text()
    .then(backend.request.bind(backend))
    .then(() => c.text("OK"))
    .catch((err) => {
      const realErr = err.cause || err;
      console.error(realErr);
      throw new HTTPException(500, { message: realErr });
    });
});

app.post("/api/receive", async (c) => {
  return await c.req
    .text()
    .then(backend.receive.bind(backend))
    .then(() => c.text("OK"))
    .catch((err) => {
      const realErr = err.cause || err;
      console.error(realErr);
      throw new HTTPException(500, { message: realErr });
    });
});

app.use(etag());

// static files
app.get("/*.json", serveStatic({ root: dataDir }));
app.get("*", serveStatic({ root: staticDir }));

export default {
  fetch: app.fetch,
} satisfies Deno.ServeDefaultExport;
