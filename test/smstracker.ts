import { Feature, Point } from "geojson";
import test, { suite } from "node:test";
import { SmsTrackerParser } from "../src/parser/smstracker";

suite("sms tracker parser", () => {
  test("correct message", (fn) => {
    const tracker: Feature<Point> = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [1.23, 4.56] },
      properties: { name: "test" },
    };
    const result = new SmsTrackerParser().parse(
      "Lat:1.23\nLon:4.56\nBat:99%\nmore\nmore",
      tracker
    );
    fn.assert.equal(true, result);
    fn.assert.deepEqual(
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [4.56, 1.23] },
        properties: { name: "test", battery: "99%" },
      },
      tracker
    );
  });

  test("coord incomplete", (fn) => {
    const tracker: Feature<Point> = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [1.23, 4.56] },
      properties: { name: "test" },
    };
    const result = new SmsTrackerParser().parse(
      "Lat:1.23\nBat:99%\nmore\nmore",
      tracker
    );
    fn.assert.equal(false, result);
    fn.assert.deepEqual(
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [1.23, 4.56] },
        properties: { name: "test" },
      },
      tracker
    );
  });

  test("battery missing", (fn) => {
    const tracker: Feature<Point> = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [1.23, 4.56] },
      properties: { name: "test" },
    };
    const result = new SmsTrackerParser().parse(
      "Lat:1.23\nLon:4.56\nmore\nmore",
      tracker
    );
    fn.assert.equal(false, result);
    fn.assert.deepEqual(
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [1.23, 4.56] },
        properties: { name: "test" },
      },
      tracker
    );
  });

  test("wrong message", (fn) => {
    const tracker: Feature<Point> = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [1.23, 4.56] },
      properties: { name: "test" },
    };
    const result = new SmsTrackerParser().parse("more\nmore", tracker);
    fn.assert.equal(false, result);
    fn.assert.deepEqual(
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [1.23, 4.56] },
        properties: { name: "test" },
      },
      tracker
    );
  });
});
