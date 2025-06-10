import { Feature, Point, Position } from "npm:geojson";
import { TrackersParser } from "../types.d.ts";

export class SmsTrackerParser implements TrackersParser {
  parse(message: string, tracker: Feature<Point>): boolean {
    const coord: Position = [0, 0];
    let battery = undefined;

    message.split(/[\r\n]+/).forEach((line) => {
      if (line.startsWith("Lon:")) {
        coord[0] = parseFloat(line.substring(4));
      } else if (line.startsWith("Lat:")) {
        coord[1] = parseFloat(line.substring(4));
      } else if (line.startsWith("Bat:")) {
        battery = line.substring(4);
      }
    });

    if (coord[0] && coord[1] && battery && tracker.properties) {
      tracker.geometry.coordinates = coord;
      tracker.properties.battery = battery;
      return true;
    }

    return false;
  }
}
