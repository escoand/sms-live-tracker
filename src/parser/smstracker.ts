import { Feature, Point, Position } from "geojson";
import { TrackersParser } from "../types";

export class SmsTrackerParser implements TrackersParser {
  parse(message: string, tracker: Feature<Point>): boolean {
    let coord: Position = [undefined, undefined];
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

    if (coord[0] && coord[1] && battery) {
      tracker.geometry.coordinates = coord;
      tracker.properties.battery = battery;
      return true;
    }

    return false;
  }
}
