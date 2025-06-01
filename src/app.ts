import { config } from "dotenv";
import { readFile, writeFile } from "fs/promises";
import { Feature, FeatureCollection, Point } from "geojson";
import http, { IncomingMessage, ServerResponse } from "http";
import handler from "serve-handler";
import { SmsGateApp } from "./api.smsgateapp";
import { TrackersApi, TrackersApp } from "./types";

const port = 3000;
const dataDir = "data";
const staticDir = "www";
const trackersFile = dataDir + "/trackers.json";

class TrackerApp implements TrackersApp {
  private _data: FeatureCollection<Point>;
  private _api: TrackersApi;

  constructor() {
    this._api = new SmsGateApp(this);
    this._readData();
    this._startServer();
  }

  getTracker(trackerNameOrNumber: string): Feature<Point> | undefined {
    return this._data?.features?.find(
      (_) =>
        _.properties.name === trackerNameOrNumber ||
        _.properties.number === trackerNameOrNumber
    );
  }

  syncTrackers() {
    writeFile(trackersFile, JSON.stringify(this._data));
  }

  private _readData() {
    readFile(trackersFile).then((buf) => {
      this._data = JSON.parse(buf.toString());
    });
  }

  private _startServer() {
    http
      .createServer((req: IncomingMessage, res: ServerResponse) => {
        res.on("finish", () => this._accessLog(req, res));

        // api middleware
        if (req.url?.startsWith("/api/")) {
          // request position
          if (req.method == "POST" && req.url == "/api/request") {
            const body: any[] = [];
            req
              .on("data", (chunk) => body.push(chunk))
              .on("end", () =>
                this._api
                  .request(body.toString())
                  .then(() => res.writeHead(200).end())
                  .catch((err) => {
                    const realErr = err.cause || err;
                    console.log(realErr);
                    res.writeHead(500, realErr.message).end();
                  })
              );
          }

          // receive position
          else if (req.method == "POST" && req.url == "/api/receive") {
            const body: any[] = [];
            req
              .on("data", (chunk) => body.push(chunk))
              .on("end", () =>
                this._api
                  .receive(body.toString())
                  .then(() => res.writeHead(200, "OK").end())
                  .catch((err) => {
                    const realErr = err.cause || err;
                    console.log(realErr);
                    res.writeHead(500, realErr.message).end();
                  })
              );
          }

          // else
          else {
            res.writeHead(400, "Bad Request").end();
          }

          return;
        }

        handler(req, res, {
          directoryListing: false,
          etag: true,
          rewrites: [
            { source: "/:name.json", destination: dataDir + "/:name.json" },
            { source: "/", destination: staticDir + "/index.html" },
            { source: "/:url", destination: staticDir + "/:url" },
          ],
        });
      })
      .listen(port);
  }

  private _accessLog(req: IncomingMessage, res: ServerResponse) {
    console.info(
      req.socket.remoteAddress,
      "-",
      "-",
      `"${req.method} ${req.url} HTTP/${req.httpVersion}"`,
      res.statusCode,
      req.socket.bytesWritten
    );
  }
}

config();
new TrackerApp();
