import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { etag } from "hono/etag";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { SmsGateApp } from "./src/backend/smsgateapp.ts";
import { TrackerStore } from "./src/store.ts";

const port = 3000;
const dataDir = "data";
const staticDir = "www";
const trackersFile = dataDir + "/trackers.json";

const store = new TrackerStore(trackersFile);
const backend = new SmsGateApp(store);
const app = new Hono();

app.post("/api/request", (c) =>
  c.req
    .text()
    .then((text) => backend.request(text))
    .then(() => c.status(200))
    .catch((err) => {
      const realErr = err.cause || err;
      console.error(realErr);
      throw new HTTPException(500, { message: realErr });
    })
);

app.post("/api/receive", (c) =>
  c.req
    .text()
    .then((text) => backend.receive(text))
    .then(() => c.status(200))
    .catch((err) => {
      const realErr = err.cause || err;
      console.error(realErr);
      throw new HTTPException(500, { message: realErr });
    })
);

app.use(logger());
app.use(etag());

// static files
app.get("/*.json", serveStatic({ root: dataDir }));
app.get("*", serveStatic({ root: staticDir }));

Deno.serve({ port }, app.fetch);
