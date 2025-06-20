import { Feature, Point } from "npm:geojson";

export type LiveTrackerConfig = {
  readonly apiKey?: string;
};

export interface TrackersStore {
  getTracker(trackerNameOrNumber: string): Feature<Point> | undefined;
  parseMessage(message: string, tracker: Feature<Point>): void;
  syncTrackers(): void;
}

export interface TrackersBackend {
  request(trackerName: string): Promise<any>;
  receive(payload: string): Promise<any>;
}

export interface TrackersParser {
  parse(message: string, tracker: Feature<Point>): boolean;
}
