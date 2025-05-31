export type LiveTrackerConfig = {
  readonly apiKey?: string;
};

export interface TrackersApi {
  request: (trackerName: string) => Promise;
  receive: (payload: string) => Promise;
}
