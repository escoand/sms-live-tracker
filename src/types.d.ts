import { Feature, Point } from "geojson";

export type LiveTrackerConfig = {
  readonly apiKey?: string;
};

export interface TrackersApp {
  getTracker(trackerNameOrNumber: string): Feature<Point> | undefined;
  parseMessage(message: string, tracker: Feature<Point>): void;
  syncTrackers(): void;
}

export interface TrackersBackend {
  request(trackerName: string): Promise;
  receive(payload: string): Promise;
}

export interface TrackersParser {
  parse(message: string, tracker: Feature<Point>): boolean;
}
