import { readFile, writeFile } from "node:fs/promises";
import { Feature, FeatureCollection, Point } from "npm:geojson";
import { SmsTrackerParser } from "./parser/smstracker.ts";
import { TrackersStore, TrackersParser } from "./types.d.ts";

export class TrackerStore implements TrackersStore {
  private _trackersFile: string;
  private _data: FeatureCollection<Point> = {
    type: "FeatureCollection",
    features: [],
  };
  private _parsers: TrackersParser[];

  constructor(trackersFile: string) {
    this._trackersFile = trackersFile;
    this._parsers = [new SmsTrackerParser()];

    readFile(this._trackersFile).then((buf) => {
      this._data = JSON.parse(buf.toString());
    });
  }

  getTracker(trackerNameOrNumber: string): Feature<Point> | undefined {
    return this._data?.features?.find(
      (_: Feature) =>
        _.properties?.name === trackerNameOrNumber ||
        _.properties?.number === trackerNameOrNumber
    );
  }

  parseMessage(message: string, tracker: Feature<Point>): void {
    if (!this._parsers.some((parser) => parser.parse(message, tracker))) {
      console.warn(
        "no parser able to parse message:",
        message.replace(/\r/g, "\\r").replace(/\n/g, "\\n")
      );
    }
  }

  syncTrackers() {
    writeFile(this._trackersFile, JSON.stringify(this._data));
  }
}
