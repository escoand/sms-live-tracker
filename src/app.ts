import { config } from "dotenv";
import http from "http";
import { AddressInfo } from "net";
import handler from "serve-handler";
import { SmsGateway } from "./api.smsgateapp";
import { TrackersApi } from "./types";

const dataDir = "data";
const staticDir = "www";

config();

const api: TrackersApi = new SmsGateway();

const server = http.createServer((req, res) => {
  res.on("finish", () => console.info(res.statusCode, req.method, req.url));

  // api middleware
  if (req.url?.startsWith("/api/")) {
    // request position
    if (req.method == "POST" && req.url == "/api/request") {
      const body: any[] = [];
      req
        .on("data", (chunk) => body.push(chunk))
        .on("end", () =>
          api
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
          api
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
});

server.listen(3000, () => {
  const addr = server.address() as AddressInfo;
  console.log("server started on " + addr.address + ":" + addr.port);
});
