import { config } from "dotenv";
import { readFile } from "fs";
import * as http from "http";
import { AddressInfo } from "net";
import { SmsGateway } from "./api.smsgateapp";
import { TrackersApi } from "./types";

const dataDir = "data";
const staticDir = "www";
const api: TrackersApi = new SmsGateway();

config();

const server = http.createServer((req, res) => {
  res.on("finish", () => console.info(res.statusCode, req.method, req.url));

  // api middleware
  if (req.url?.startsWith("/api/")) {
    // request position
    if (req.method == "POST" && req.url == "/api/request") {
      const body: any[] = [];
      req
        .on("data", (chunk) => body.push(chunk))
        .on("end", () => {
          api
            .request(body.toString())
            .then(() => res.writeHead(200).end())
            .catch((err) => {
              const msg = err.cause?.message || err.message;
              console.log(msg);
              res.writeHead(500, msg).end();
            });
        });
    }

    // receive position
    else if (req.method == "POST" && req.url == "/api/receive") {
      const body: any[] = [];
      req
        .on("data", (chunk) => body.push(chunk))
        .on("end", () => {
          api
            .receive(body.toString())
            .then(() => res.writeHead(200, "OK").end())
            .catch((err) => {
              const msg = err.cause?.message || err.message;
              console.log(msg);
              res.writeHead(500, msg).end();
            });
        });
    }

    // else
    else {
      res.writeHead(400, "Bad Request").end();
    }
  }

  // static and data
  else if (req.method == "GET") {
    let localFile;

    if (req.url == "/") {
      localFile = staticDir + "/index.html";
    } else if (req.url.endsWith(".json")) {
      localFile = dataDir + req.url;
    } else {
      localFile = staticDir + req.url;
    }

    readFile(localFile, (err, data) => {
      if (!err && data) {
        res.write(data.toString());
        res.end();
      } else {
        res.writeHead(404, "Not found").end();
      }
    });
  }

  // else
  else {
    res.writeHead(400, "Bad Request").end();
  }
});

server.listen(3000, () => {
  const addr = server.address() as AddressInfo;
  console.log("server started on " + addr.address + ":" + addr.port);
});
