import { Feature, Point } from "geojson";

export type LiveTrackerConfig = {
  readonly apiKey?: string;
};

export interface TrackersApp {
  getTracker: (trackerNameOrNumber: string) => Feature<Point> | undefined;
  syncTrackers: () => void;
}

export interface TrackersApi {
  request: (trackerName: string) => Promise;
  receive: (payload: string) => Promise;
}
