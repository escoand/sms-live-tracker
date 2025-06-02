import { Feature, Point } from "geojson";
import { suite, test } from "node:test";
import { SmsGateApp } from "../src/api/smsgateapp";
import { TrackersApp } from "../src/types";

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

const mockApi = (tracker: Feature<Point>): TrackersApp => ({
  getTracker(trackerNameOrNumber: string): Feature<Point> | undefined {
    return tracker;
  },
  parseMessage(message: string, tracker: Feature<Point>): void {
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

suite("sms-gate.app backend", async () => {
  test("request", async (fn) => {});

  test("sent event", async (fn) => {
    const data = JSON.parse(JSON.stringify(tracker));
    const api = new SmsGateApp(mockApi(data));
    api.receive(testData("sms:sent", "sentAt"));
    fn.assert.deepEqual(data.properties, {
      name: "name-DUMMY",
      sent: "2025-01-01T01:02:03.000Z",
      received: "received-DUMMMY",
    });
  });

  test("deliver event", async (fn) => {
    const data = JSON.parse(JSON.stringify(tracker));
    const api = new SmsGateApp(mockApi(data));
    api.receive(testData("sms:delivered", "deliveredAt"));
    fn.assert.deepEqual(data.properties, {
      name: "name-DUMMY",
      delivered: "2025-01-01T01:02:03.000Z",
      received: "received-DUMMMY",
    });
  });

  test("receive event", async (fn) => {
    const data = JSON.parse(JSON.stringify(tracker));
    const api = new SmsGateApp(mockApi(data));
    api.receive(testData("sms:received", "receivedAt"));
    fn.assert.deepEqual(data.properties, {
      name: "name-DUMMY",
      received: "2025-01-01T01:02:03.000Z",
    });
  });

  test("fail event", async (fn) => {
    const data = JSON.parse(JSON.stringify(tracker));
    const api = new SmsGateApp(mockApi(data));
    api.receive(testData("sms:failed", "failedAt"));
    fn.assert.deepEqual(data.properties, {
      name: "name-DUMMY",
      failed: "2025-01-01T01:02:03.000Z",
      received: "received-DUMMMY",
    });
  });

  test("unknown tracker", async (fn) => {
    const api = new SmsGateApp(mockApi(null));
    api.receive(testData("sms:received", "wrongDateAttribute"));
  });

  test("wrong date", async (fn) => {
    const data = JSON.parse(JSON.stringify(tracker));
    const api = new SmsGateApp(mockApi(data));
    const result = api.receive(testData("sms:received", "wrongDateAttribute"));
    fn.assert.rejects(result);
  });

  test("unexpected event", async (fn) => {
    const data = JSON.parse(JSON.stringify(tracker));
    const api = new SmsGateApp(mockApi(data));
    const result = api.receive(testData("something", "wrongDateAttribute"));
    fn.assert.rejects(result);
  });
});
