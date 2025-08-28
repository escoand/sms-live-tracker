import process from "node:process";
import { suite, test } from "node:test";
import { Feature, Point } from "npm:geojson";
import { SmsGateApp } from "../src/backend/smsgateapp/smsgateapp.ts";
import { TrackersStore } from "../src/types.d.ts";

process.env.API_AUTHENTICATION = "test";
process.env.API_ENCRYPTION = "test";
process.env.API_MESSAGE = "test";

const tracker: Feature<Point> = {
  type: "Feature",
  geometry: { type: "Point", coordinates: [] },
  properties: {
    name: "name-DUMMY",
    requested: "requested-DUMMMY",
    sent: "sent-DUMMMY",
    delivered: "delivered-DUMMMY",
    received: "received-DUMMMY",
    failed: "failed-DUMMMY",
  },
};

const mockApi = (tracker: Feature<Point>): TrackersStore => ({
  getTracker(_trackerNameOrNumber: string): Feature<Point> | undefined {
    return tracker;
  },
  parseMessage(_message: string, _tracker: Feature<Point>): void {
    // ignore
  },
  syncTrackers() {
    // ignore
  },
});

const testData = (event: string, dateAttribute: string) =>
  JSON.stringify({
    event,
    payload: {
      phoneNumber: "+123456789",
      message: "Test",
      [dateAttribute]: "2025-01-01T01:02:03.000+00:00",
    },
  });

suite("sms-gate.app backend", (fn) => {
  test("request", (fn) => {});

  test("sent event", async (fn) => {
    const data = JSON.parse(JSON.stringify(tracker));
    const api = new SmsGateApp(mockApi(data));

    await fn.assert.doesNotReject(() =>
      api.receive(testData("sms:sent", "sentAt"))
    );
    fn.assert.deepEqual(data.properties, {
      name: "name-DUMMY",
      sent: "2025-01-01T01:02:03.000Z",
      received: "received-DUMMMY",
    });
  });

  test("deliver event", async (fn) => {
    const data = JSON.parse(JSON.stringify(tracker));
    const api = new SmsGateApp(mockApi(data));

    await fn.assert.doesNotReject(() =>
      api.receive(testData("sms:delivered", "deliveredAt"))
    );
    fn.assert.deepEqual(data.properties, {
      name: "name-DUMMY",
      delivered: "2025-01-01T01:02:03.000Z",
      received: "received-DUMMMY",
    });
  });

  test("receive event", async (fn) => {
    const data = JSON.parse(JSON.stringify(tracker));
    const api = new SmsGateApp(mockApi(data));

    await fn.assert.doesNotReject(() =>
      api.receive(testData("sms:received", "receivedAt"))
    );
    fn.assert.deepEqual(data.properties, {
      name: "name-DUMMY",
      received: "2025-01-01T01:02:03.000Z",
    });
  });

  test("fail event", async (fn) => {
    const data = JSON.parse(JSON.stringify(tracker));
    const api = new SmsGateApp(mockApi(data));
    await fn.assert.doesNotReject(() =>
      api.receive(testData("sms:failed", "failedAt"))
    );
    fn.assert.deepEqual(data.properties, {
      name: "name-DUMMY",
      failed: "2025-01-01T01:02:03.000Z",
      received: "received-DUMMMY",
    });
  });

  test("unknown tracker", async (fn) => {
    // @ts-ignore skip type check for null
    const api = new SmsGateApp(mockApi(null));
    await fn.assert.doesNotReject(() =>
      api.receive(testData("sms:received", "wrongDateAttribute"))
    );
  });

  test("wrong date", async (fn) => {
    const data = JSON.parse(JSON.stringify(tracker));
    const api = new SmsGateApp(mockApi(data));
    await fn.assert.doesNotReject(() =>
      api.receive(testData("sms:received", "wrongDateAttribute"))
    );
    fn.assert.deepEqual(data.properties, {
      name: "name-DUMMY",
      received: "received-DUMMMY",
    });
  });

  test("unexpected event", async (fn) => {
    const data = JSON.parse(JSON.stringify(tracker));
    const api = new SmsGateApp(mockApi(data));
    await fn.assert.rejects(() =>
      api.receive(testData("something", "wrongDateAttribute"))
    );
  });
});
